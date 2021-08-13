package Type

import (
	"time"
)

type (
	Command struct {
	    Name int
	    Params interface{}
	}
	CmdLogin struct {
	    Login string `json:"login"`
	    SkinIndex int `json:"skin_index"`
	}
	CmdLoginResult struct {
		Id int `json:"id"`
		Time time.Time `json:"time"`
		Login string `json:"login"`
		X float64 `json:"x"`
		Y float64 `json:"y"`
		RoomName string  `json:"room_name"`
		Size int `json:"size"`
		SkinIndex int `json:"skin_index"`
		Autopilot bool `json:"autopilot"`
		ArenaRadius int `json:"arena_radius"`
	}
	CmdRadarResult struct {
		Points [][]int `json:"points"`
		Top10 string `json:"top10"`
		CountTotal int `json:"count_total"`
	}
	CmdMessage struct {
		Message string `json:"msg"`
	}
	CmdUserExit struct {
		Id int `json:"id"`
		Login string `json:"login"`
		Time time.Time `json:"time"`
	}
	CmdUpdatePoints struct {
		Id int `json:"id"`
		Value int `json:"value"`
	}
	CmdUserShow struct {
		Id int `json:"id"`
		Time time.Time `json:"time"`
		Login string `json:"login"`
		X float64 `json:"x"`
		Y float64 `json:"y"`
		Size int `json:"size"`
		SkinIndex int `json:"skin_index"`
		Balls [][]int `json:"balls"`
	}
	CmdUserHide struct {
		Id int `json:"id"`
		Time time.Time `json:"time"`
		Login string `json:"login"`
	}
)
