import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import Slider from "react-slick";
import io from "socket.io-client";
import UserView from "./UserView";

//const ENDPOINT = "http://localhost:5000";
const ENDPOINT = process.env.REACT_APP_BASE_URL_WJ + "/webrtc";
let socket;

function UserSlider(props) {

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };


  const location = useLocation();
  //const query = queryString.parse(location.search);
  const name = props.name;
  //const name = localStorage.getItem("userId");
  const room = props.room;
  console.log("Rtcview : ", name, room);
  let myStream;

  const NOTICE_CN = "noticeChat";
  const [cameraOptions, setCameraOptions] = useState([]);
  const [messages, setMessage] = useState([]);
  let peopleInRoom = 1;
  let pcObj = [];

  const myVideo = useRef();
  const videoRef = useRef([]);
  
  const [cameraOn, setCameraOn] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [userList, setUserList] = useState([]);
  const [statsList, setStatsList] = useState([]);

  localStorage.setItem("count",0);
  
  let userInfo = [];
  let userStatsArr = [];

  console.log("userList", userList);

  useEffect(() => {

  socket = io(ENDPOINT, {
    //withCredentials: true,
    extraHeaders: {
      "my-custom-header": "abcd",
    },
  });

    if (socket.disconnected) {
      socket.connect();
    }
    socket.emit("join_room", { roomName: room, nickName: name });

    socket.on("accept_join", async (userObjArr, usersStats) => {
      console.log("----------------accept_join---------------------------------------", userObjArr, usersStats);
      //state를 두번 업데이트 하는 행동이니 수정할것.
      setStatsList(usersStats);
      setUserList(userObjArr);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      userInfo=[...userInfo, ...userObjArr];
      // eslint-disable-next-line react-hooks/exhaustive-deps
      userStatsArr=[...userStatsArr, ...usersStats];
      props.statusCallBack(userStatsArr);

      let myStat = usersStats.filter((res)=>{
        return res.socketId===socket.id
      })

      props.myStatusCallBack(myStat);


      await initCall();

      const length = userObjArr.length;
      if (length === 1) {
        return;
      }

      writeChat("Notice!", NOTICE_CN);
      for (let i = 0; i < length - 1; ++i) {
        try {
          const newPC = createConnection(
            userObjArr[i].socketId,
            userObjArr[i].nickName,
            i
          );
          const offer = await newPC.createOffer({
            //추가부분
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await newPC.setLocalDescription(offer);
          socket.emit("offer", {
            offer: offer,
            localNickName: name,
            remoteSocketId: userObjArr[i].socketId,
          });
          writeChat(`__${userObjArr[i].nickname}__`, NOTICE_CN);
        } catch (err) {
          console.error(err);
        }
      }
      writeChat("방에 있습니다.", NOTICE_CN);
    });

    socket.on("offer", async (offer, remoteSocketId, remoteNickname, userStat) => {
      console.log("--------------------------client on.offer-----------------------------", remoteNickname, peopleInRoom, userStat);
      const data = {socketId: remoteSocketId, nickName: remoteNickname, video: true, audio: false};
      setStatsList((prev)=>[...prev, userStat]);
      setUserList((prev)=>[...prev, data]);
      
      
      //dispatch(addNowProjectUsers(data))
      userInfo=[...userInfo, data];
      userStatsArr=[...userStatsArr, userStat];
      props.statusCallBack(userStatsArr);
      
      const temp = localStorage.getItem("count");
      localStorage.setItem("count", temp+1);

      try {
        const newPC = createConnection(remoteSocketId, remoteNickname);
        await newPC.setRemoteDescription(offer);
        const answer = await newPC.createAnswer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
        await newPC.setLocalDescription(answer);
        socket.emit("answer", {
          answer: answer,
          remoteSocketId: remoteSocketId,
        });
        writeChat(`notice! __${remoteNickname}__ joined the room`, NOTICE_CN);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("answer", async (answer, remoteSocketId) => {
      await pcObj[remoteSocketId].setRemoteDescription(answer);
    });

    socket.on("ice", async (ice, remoteSocketId) => {
      await pcObj[remoteSocketId].addIceCandidate(ice);
    });

    socket.on("videoON", async (nickName, videoStatus) => {
      
      videoToggleExceptMe(nickName, videoStatus);
    
    });

    socket.on("videoOFF", async (nickName, videoStatus) => {

        videoToggleExceptMe(nickName, videoStatus);
    
    });

    socket.on("leaveRoom", (leavedSocketId) => {
      removeVideo(leavedSocketId);
      //writeChat(`notice! ${nickName} leaved the room.`, NOTICE_CN);
      --peopleInRoom;
      //sortStreams();
    });

    return (()=>{
      console.log("새로고침 할 때 불러지나?");
      socket.disconnect();
      }
      )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ENDPOINT, location.pathname]);

  function writeChat(message, className = null) {
    setMessage([...messages, message]);
  }

  async function getCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      const currentCamera = myStream.getVideoTracks();

      cameras.forEach((camera) => {
        const option = document.createElement("option");
        option.value = camera.deviceId;
        option.innerText = camera.label;

        if (currentCamera.label === camera.label) {
          option.selected = true;
        }

        //camerasSelect.appendChild(option);
      });
      setCameraOptions([
        ...cameraOptions,
        { value: cameras[0].deviceId, label: cameras[0].deviceId },
      ]);
    } catch (error) {
      console.log(error);
    }
  }

  async function getMedia(deviceId) {
    const initialConstraints = {
      audio: true,
      video: { facingMode: "user" },
    };
    const cameraConstraints = {
      audio: true,
      video: { deviceId: { exact: deviceId } },
    };

    try {
      myStream = await navigator.mediaDevices.getUserMedia(
        deviceId ? cameraConstraints : initialConstraints
      );

      // stream을 mute하는 것이 아니라 HTML video element를 mute한다.
      addVideoStream(myVideo.current, myStream);
      //videoGrid.current.append(myVideo.current);

      if (!deviceId) {
        // mute default
        myStream //
          .getAudioTracks()
          .forEach((track) => (track.enabled = false));

        await getCameras();
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function initCall() {
    await getMedia();
  }

  function videoToggleExceptMe(nickName, status){
    

    const newList = userInfo.map((user) => {
      if(user.nickName===nickName){
        return {...user, video : status};
      }else return user;
    })  

    userInfo = newList;
    setUserList(newList);

    return;
    
  }

  function createConnection(remoteSocketId, remoteNickname, idx) {
    const myPeerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
          ],
        },
      ],
    });
    
    myPeerConnection.addEventListener("icecandidate", (event) => {
      handleIce(event, remoteSocketId);
    });
    
    myPeerConnection.addEventListener("addstream", (event) => {
      handleAddStream(event, remoteSocketId, remoteNickname, idx);
    });

    // myPeerConnection.addEventListener(
    //   "iceconnectionstatechange",
    //   handleConnectionStateChange
    // );
    myStream //
      .getTracks()
      .forEach((track) => myPeerConnection.addTrack(track, myStream));

    pcObj[remoteSocketId] = myPeerConnection;
    //pcObj = [...pcObj, {socketId:remoteSocketId, stream: myPeerConnection}];

    ++peopleInRoom;
    //sortStreams();
    return myPeerConnection;
  }

  function handleIce(event, remoteSocketId) {
    if (event.candidate) {
      socket.emit("ice", {
        ice: event.candidate,
        remoteSocketId: remoteSocketId,
      });
    }
  }

  function handleAddStream(event, remoteSocketId, remoteNickname, idx) {
    const peerStream = event.stream;
    paintPeerFace(peerStream, remoteSocketId, remoteNickname, idx);
  }

  function paintPeerFace(peerStream, id, remoteNickname, idx) {
    console.log("peerStream : ", peerStream, userList, idx, remoteNickname, peopleInRoom);

    //새로 참여한 유저의 index가 항상 length+1이 될까??
    if(idx===undefined||idx===null){
    
      idx = peopleInRoom-1;

      
      //idx=userList.length+1
    }



      addVideoStream(videoRef.current[idx], peerStream);
      
  }

  function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
  }

  // function sortStreams() {
  //   const streams = document.querySelector("#streams");
  //   const streamArr = streams.querySelectorAll("div");
  //   streamArr.forEach((stream) => (stream.className = `people${peopleInRoom}`));
  // }

  function removeVideo(leavedSocketId) {

    const newList = userInfo.filter((item)=>{
      return item.socketId !== leavedSocketId;
    })

    const newStatList = statsList.filter((item)=>{
      return item.socketId !== leavedSocketId;
    })

    delete pcObj.socketId;

    
    userStatsArr = newStatList;
    setStatsList(newStatList);

    userInfo = newList;
    setUserList(newList);
  }

  const handleCamera = async () => {
    setCameraOn((prev) => !prev);

    if (cameraOn) {
      let video = myVideo.current.srcObject.getVideoTracks();
      video[0].enabled = false;
      socket.emit("videoOFF", { nickName: name, roomName : room });

    } else {
      let video = myVideo.current.srcObject.getVideoTracks();
      video[0].enabled = true;
      socket.emit("videoON", { nickName: name, roomName : room });
    }
  };

  const handleAudio = () => {
    setAudioOn((prev) => !prev);
    if (audioOn) {
      let video = myVideo.current.srcObject.getAudioTracks();
      video[0].enabled = false;
      socket.emit("audioON", { userId: localStorage.getItem("userId") });
    } else {
      let video = myVideo.current.srcObject.getAudioTracks();
      video[0].enabled = true;
      socket.emit("audioOFF", { userId: localStorage.getItem("userId") });
    }
  };

  return (
    <div className="w-[70vw] bg-red-400 mr-10">
      <Slider {...sliderSettings}>
        <div className="w-fit h-[80vh] bg-[#F2F3F7]">
          <div className="flex flex-wrap">
            
            {userList.map((user, idx)=>{
              
              //본인만 버튼 뜨도록
              if(user.socketId===socket.id){
              return(<UserView
              userDetailShow={props.userDetailShow}
              key={user.nickName}
              idx={-1}
              $isMee
              user={user}
              stats={statsList[idx]}
              cameraOn={cameraOn}
              myVideo={myVideo}
              handleCamera={handleCamera}
              handleAudio={handleAudio}
              cameraStatus={cameraOn}
              audioStatus={audioOn}
              ></UserView>)
              }else{
              //타인
              return(<UserView
              userDetailShow={props.userDetailShow}
              $isMee={false}
              key={user.nickName}
              idx={idx}
              user={user}
              stats={statsList[idx]}
              cameraOn={user.video}
              myVideo={videoRef}
              _onMouseOver={props._onMouseOver}
              _onMouseOut={props._onMouseOut}
              ></UserView>)
              }
            })
            }

          </div>
        </div>
      </Slider>
    </div>
  );
}

export default UserSlider;
