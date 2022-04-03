import * as React from "react";
import { useEffect } from "react";
import exUser from "../static/images/userStats/example_user.png";
import ChatPrac from "../Components/Organisms/DMChat/ChatPrac";
import RadarChart from "../Components/Molecules/RadarChart";
import clip from "../static/images/projectRoom/clip.png"
import ProjectRoomHeader from "../Components/Molecules/ProjectRoomHeader";
import UserSlider from "../Components/Organisms/projectRoom/UserSlider";
import { useLocation, useNavigate } from "react-router";
import UserDetailModal from "./UserDetailModal";
import { useDispatch } from "react-redux";
import { getSelectedUserInfo } from "../redux/modules/users";

export default function ProjectRoom() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLeader, setIsLeader] = React.useState(false);
  const [mode, setMode] = React.useState(true);
  const [curr, setCurr] = React.useState("");
  const [userStats, setUserStats] = React.useState([]);
  const [myStat, setMyStat] = React.useState();
  const [showUserDetail, setShowUserDetail] = React.useState(false);

  const location = useLocation();
  
  const room = location.state;
  const name = localStorage.getItem("userId");

  console.log("room", room);

  useEffect(() => {
    if (isLeader === localStorage.getItem("userId")) {
      setIsLeader(true);
    }
  }, [isLeader]);

  const goBack = () => {
    navigate(-1);
  }

  const statusCallBack = (data) => {
    
    console.log("StatusCallback!", data);
    setUserStats(data);
  }

  const myStatusCallBack = (data) => {
    console.log("myStatusCallBack", data[0].usersStackObj);

    setMyStat(data[0].usersStackObj);
  }

  const userDetailShow = (id) => {
    console.log("profile card clicked", id);

    dispatch(getSelectedUserInfo(id, ()=>{setShowUserDetail(true)}));
    return;
  };

  return (
    
      <div className="bg-[#F2F3F7]">

        <UserDetailModal
          showUser={showUserDetail}
          callBackSetShowFalse={() => {
            console.log("setShowDetailFalse");
            return setShowUserDetail(false);
          } }/>

        <ProjectRoomHeader goBack={goBack}></ProjectRoomHeader>

        <div className="flex w-screen">
          
          <UserSlider userDetailShow={userDetailShow} statusCallBack={statusCallBack} myStatusCallBack={myStatusCallBack} name={name} room={room} 
          exUser={exUser} _onMouseOut={()=>{setCurr("");}} _onMouseOver={(nick)=>{
            console.log("-----------mouseOver nick!------------", nick);
            setCurr(nick)}}></UserSlider>
          
          {mode &&
          <div className="relative w-[25vw] h-[80vh] rounded-xl mr-10 pr-10 border-2 p-2 bg-white pb-7">
            <div className="top-0 flex justify-end w-full h-[3vh] cursor-pointer">
              <img onClick={()=>{setMode(false)}} src={clip} alt={""}></img>
            </div>
            
            <ChatPrac name={name} room={room}></ChatPrac>
          
          </div>
          }

          {!mode &&
          <div className="w-[25vw] h-[80vh] rounded-xl mr-10 pr-10 border-2 p-2">
            <div className="flex justify-end w-full h-[3vh] cursor-pointer">
              <img onClick={()=>{setMode(true)}} src={clip} alt={""}></img>
            </div>
            
            <div className="h-[95vh] ml-11 mr-11">
              <RadarChart userStats={userStats} myStat={myStat} curr={curr}></RadarChart>
            </div>  
            
          </div>
          }
          
        
        </div>

      </div>
    
  );
}
