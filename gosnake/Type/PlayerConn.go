package Type

import (
	"github.com/gorilla/websocket"
	"sync"
	// "time"
	// "gosnake/Type"
)

type PlayerConn struct {
	Ws *websocket.Conn
	*Player
	Room *Room
	Mu *sync.Mutex // чтобы избежать коллизий записи в сокет
	// ticker_SendMoving chan bool
}

func (pc *PlayerConn) SendMoving() {
	if(pc.IsLogged && !pc.Gameover) {
		packet := JsonResponse{command_pos, pc.Player.PosPacket}
		mes_data := []JsonResponse{packet}
		for _, enemy := range pc.EnemyVisibleList {
			if(enemy != nil && !enemy.Gameover && enemy.IsLogged) {
				enemy_packet := JsonResponse{command_pos, enemy.PosPacket}
				mes_data = append(mes_data, enemy_packet)
			}
		}
		pc.SendJson(mes_data)
	}
}

func (pc *PlayerConn) SendJson(value interface{}) {
	//fn := func(value interface{}) {
		pc.Mu.Lock()
		defer pc.Mu.Unlock()
		pc.Ws.WriteJSON(value)
	//}
	//go fn(value)
}

// Receive msg from ws in goroutine
func (pc *PlayerConn) Receiver() {
	for {
		_, command, err := pc.Ws.ReadMessage()
		if err != nil {
			break
		}
		// execute a command
		pc.Command(string(command), pc)
		// update all conn
		pc.Room.updateAll <- true
	}
	pc.Room.leave <- pc
	pc.Ws.Close()
}
