package Type

import (
	"encoding/json"
	"math/rand"
	"strings"
	"time"
	"math"
	"log"
	"fmt"
)

type JsonResponse struct {
	Event int `json:"event"`
	Data interface{} `json:"data"`
}

type Player struct {
	Id int
	IsLogged bool
	Time time.Time
	Gameover bool
	Socket bool
	Login string
	SkinIndex int
	Ping int64
	Connection *PlayerConn
	ScreenSize int
	PosPacket PosPacket
	Autopilot PlayerAutopilot
	Size int
	NeedToKill bool
	HeadCellNumber int
	Balls []PlayerBall
	Sectors []int
	EnemyVisibleList map[int]*PlayerConn
	VisibleCells map[int]int
	ActiveCells []int
	TouchCells map[int]bool
	ActiveCellsChanged bool
	X float64
	Y float64
	Sx float64
	Sy float64
	Scale float64
	Radius float64
	Speed float64
	AngleRadians float64
	PrevAddAppleTime int64
	TargetAngleRadians float64
	Name string
	Enemy *Player
	Room *Room
}

func (p *Player) Command(command string, pc *PlayerConn) {
	var result Command
	err := json.Unmarshal([]byte(command), &result)
	if err == nil {
		switch result.Name {
			case command_pos: // Current target angle and speed from player
				out, _ := json.Marshal(result.Params)
				var param []float64
				json.Unmarshal(out, &param)
				if (!p.Gameover && ! p.Autopilot.On) {
					AngleRadians := param[0]
					Speed := param[1]
		            p.TargetAngleRadians = float64(int((AngleRadians + math.Pi) * 100)) / 100
		            p.Speed = Speed
				}
			case command_autopilot: // Switch autopilot
				if (!p.Gameover) {
					p.Autopilot.On = !p.Autopilot.On
				}
			case command_pong: // Calculate ping
				p.Ping = time.Now().UnixNano() / int64(time.Millisecond) - p.Ping;
			case command_login: // Login
				out, _ := json.Marshal(result.Params)
				arena_radius := pc.Room.Rules.ArenaRadius
				var param CmdLogin
				json.Unmarshal(out, &param)
				// p.Id = int(rand.Float64() * 999999)
				p.Connection = pc
				p.IsLogged = true
				p.X = rand.Float64() * float64(arena_radius) * 0.9 + float64(arena_radius) * 0.05 - rand.Float64() * float64(arena_radius)
				p.Y = rand.Float64() * float64(arena_radius) * 0.9 + float64(arena_radius) * 0.05 - rand.Float64() * float64(arena_radius)
				// log.Println(arena_radius, "; ", p.X, "x", p.Y)
				p.Time = time.Now()
				p.Ping  = -1
				p.EnemyVisibleList = map[int]*PlayerConn{}
				p.PosPacket.Id = p.Id
				p.SkinIndex = param.SkinIndex % snake_skin_count
				p.ScreenSize = 1500
				p.HeadCellNumber = -1
				p.Autopilot.On = strings.Index(strings.ToLower(p.Login), "autopilot") > -1
				p.Scale = 1
				p.Speed = 1
				p.Gameover = false
				p.VisibleCells = make(map[int]int, 0)
				// устанавливает новое значение длины змейки
				p.SetPoints(pc.Room.Rules.StartSnakeSize)
				fmt.Println("New player:", p.Login, p.X, p.Y, p.Time, p.Size)
				go func() {
					var balls_count = Rooms.CalcLength(p.Size)
					response := &CmdLoginResult{
						Id: p.Id,
						Time: p.Time,
						Login: p.Login,
						RoomName: pc.Room.Name,
						X: p.X,
						Y: p.Y,
						Size: balls_count,
						SkinIndex: p.SkinIndex,
						Autopilot: p.Autopilot.On,
						ArenaRadius: arena_radius,
					}
					pc.SendJson([]JsonResponse{JsonResponse{command_connected, response}})
					/*
					packet := &JsonResponse{command_connected, response};
					msg, _ := json.Marshal(packet)
					err := ws.WriteMessage(websocket.TextMessage, []byte(msg))
					if err != nil {
							// pc.room.leave <- pc
							// pc.ws.Close()
					}*/
				}()
			default:
				log.Print("Undefined command: ", result.Name)
		}
	} else {
	    fmt.Println(err)
	}
}

func (p *Player) CalcPhysicalSize() {
	var factor float64 = float64(p.Size) / 500
	p.Scale = math.Min(float64(1 + factor), 2)
	p.Radius = float64(snake_radius) * p.Scale
}

func (p *Player) SerializeBalls() [][]int {
	resp := [][]int{}
	for i := 0; i < len(p.Balls); i++ {
		ball := p.Balls[i]
		// переводим радианы в градусы, чтобы "остаться" в рамках типа int
		var rotation int = int(ball.Rotation * (math.Pi / 180))
		resp = append(resp, []int{ball.X, ball.Y, rotation})
	}
	return resp
}

func (p *Player) AddBall(count int) {
	for i := 0; i < count; i++ {
		x := int(p.X)
		y := int(p.Y)
		rotation := p.AngleRadians
		if(p.Size > 0) {
			x = int(p.Balls[len(p.Balls) - 1].X)
			y = int(p.Balls[len(p.Balls) - 1].Y)
			rotation = p.Balls[len(p.Balls) - 1].Rotation
		}
		cell_number := p.Room.CalcCellNumber(x, y)
		p.Balls = append(p.Balls, PlayerBall{x, y, 1, cell_number, rotation})
	}
}

func (p *Player) RemoveBall(count int) {
	last_element := len(p.Balls) - count
	if(last_element < 0) {
		last_element = 0
	}
	p.Balls = p.Balls[0 : last_element]
}

// устанавливает новое значение длины змейки
func (p *Player) SetPoints(new_value int) {
	var balls_count = Rooms.CalcLength(new_value)
	// вызывается, когда игрок потратил поинты или наоборот, съел их
	if(balls_count > len(p.Balls)) {
		p.AddBall(balls_count - len(p.Balls))
	} else if(balls_count < len(p.Balls)) {
		p.RemoveBall(len(p.Balls) - balls_count)
	}
	p.Size = new_value
	p.CalcPhysicalSize()
	upd_points := []JsonResponse{JsonResponse{command_update_size, CmdUpdatePoints{p.Id, balls_count}}}
	// информацию отправлять только игрокам, которые находятся в зоне видимости
	for _, enemy := range p.EnemyVisibleList {
		// список только активных змеек, для более быстрого получения их по id
		if(!enemy.Gameover) {
			enemy.Connection.SendJson(upd_points);
		}
	}
	p.Connection.SendJson(upd_points);
}

func (p *Player) SetSkinIndex(SkinIndex int) {
	p.SkinIndex = SkinIndex
}

func (p *Player) GetState() string {
	return "Game state for Player: " + p.Name
}

func (p *Player) GiveUp() {
	log.Print("Player gave up: ", p.Name)
}
