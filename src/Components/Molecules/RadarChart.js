import React, { useRef, useEffect, useState } from "react";
import Chart from "chart.js/auto";

const dummy = {
  id: 1,
  label: "",
  data: [1,1,1,1,1],
  fill: true,
  backgroundColor: "rgba(54, 162, 235, 0.2)",
  borderColor: "rgb(54, 162, 235)",
  pointBackgroundColor: "rgb(54, 162, 235)",
  pointBorderColor: "#fff",
  pointHoverBackgroundColor: "#fff",
  pointHoverBorderColor: "rgb(54, 162, 235)",
};


function RadarChart(props) {
  const canvasDom = useRef(null);

  const [curr, setCurr] = useState(props.curr);
  const [userData, setUserData] = useState([]);
  const [myData, setMyData] = useState(dummy);

  let radarChart = null;

  const nameManufacture = (name) => {
    try{
    return name.split("&")[0];
    }catch{
      return name;
    }
  }

  function fiveScore(stat){
    const backAbilScore = stat.stack.back.ability.score;
    const backSkillScore = stat.stack.back.skills.score;
    const frontAbilScore = stat.stack.front.ability.score;
    const frontSkillScore = stat.stack.front.skills.score;
    const designScore = stat.stack.design.skills.score;
    const reliability = stat.stack.reliability;
    const cooperation = stat.stack.cooperation;

    return [Math.max(frontAbilScore,frontSkillScore),Math.max(backAbilScore,backSkillScore),designScore,reliability,cooperation];

  }

  function myChartFactory(list, nick, id){

  const my = {
    id: id,
    label: nick,
    data: list,
    fill: true,
    backgroundColor: "rgba(255, 99, 132, 0.2)",
    borderColor: "rgb(255, 99, 132)",
    pointBackgroundColor: "rgb(255, 99, 132)",
    pointBorderColor: "#fff",
    pointHoverBackgroundColor: "#fff",
    pointHoverBorderColor: "rgb(255, 99, 132)",
  };

  return my;

  }

  function chartDataFactory(list, nick, id){

    const tempData = {
      id: id,
      label: nick,
      data: list,
      fill: true,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgb(54, 162, 235)",
      pointBackgroundColor: "rgb(54, 162, 235)",
      pointBorderColor: "#fff",
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: "rgb(54, 162, 235)",
    };

    return tempData;

  }

  function statusFactory (stats) {
    //스탯에서 숫자 5개를 빼내서
    const arr = stats.map((stat)=>{
      return(fiveScore(stat))});
    //데이터형식에 맞게 가공해서
    const chartData = arr.map((item, idx)=>chartDataFactory(item, nameManufacture(stats[idx].nickname), stats[idx].userId));
    //setState를 한다.
    setUserData(chartData);

  }

  const dataSets = [myData];

  const data = {
    labels: [
      "FrontEnd",
      "BackEnd",
      "Design",
      "Reliability",
      "Cooperation",
    ],
    datasets: dataSets,
  };

  const dataList = userData;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = {
    type: "radar",
    data: data,
    options: {
      elements: {
        line: {
          borderWidth: 3,
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 100,
          suggestedMin: 0,
          stepSize: 20,
        },
      },
    },
  };

  useEffect(()=>{

    if(props.userStats){
      statusFactory(props.userStats);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[props.userStats])

  useEffect(()=>{

    if(props.myStat){
      let temp = {};
      if(Array.isArray(props.myStat)){
        temp = fiveScore(props.myStat[0]);
        temp = myChartFactory(temp, nameManufacture(props.myStat[0].nickname), props.myStat[0].userId);
      }else{
        temp = fiveScore(props.myStat);
        temp = myChartFactory(temp, nameManufacture(props.myStat.nickname), props.myStat.userId);
      }
      setMyData(temp);
    }

  },[props.myStat])

  useEffect(()=>{
    setCurr(props.curr);
  },[props.curr])

  useEffect(() => {
    setCurr(props.curr)
    if(props.curr===myData.userId){
      //config.data.datasets.pop();
    }else{
      const selectedData = dataList.filter((datum) => {
        return datum.id === props.curr
      })
      if(selectedData.length>0){
      config.data.datasets.push(selectedData[0]);
      }
    }

    const ctx = canvasDom.current.getContext("2d");

    // eslint-disable-next-line react-hooks/exhaustive-deps
    radarChart = new Chart(ctx, config);

    return function cleanup () { 
      radarChart.destroy()
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, curr, userData]);


  return (
    
      <canvas ref={canvasDom}></canvas>
    
  );
}

export default RadarChart;
