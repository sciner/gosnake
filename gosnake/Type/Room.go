package Type

/**
	TODO:
	1. ТОП-10
	2. переписать со старой версии механизм отложенных расчетов столкновений змеек
**/

import (
	"gosnake/utils"
	"log"
	"time"
	"math"
	"bytes"
	"sort"
	"sync"
	"math/rand"
	"strings"
	"strconv"
)

const (
	// Правила и ограничения игры по умолчанию
	START_SNAKE_SIZE int = 10
	ARENA_RADIUS int = 2000
	APPLE_INTENSIVE int = 1
	KILL_ON_COLLISION_SNAKES bool = true // убивать змейку, которая коснулась другую змейку
	ADD_APPLES_ON_COLLISION_WALL bool = false // создавать еду на месте погибшей змеи, которая погибла от косания  стены

	// константы
	snake_radius int = 26
	snake_skin_count int = 11
	cell_size int = 1000
	// команды
	command_pos int 			= 1
	command_eat int 			= 2
	command_update_size int 	= 3
	command_add_apple int 		= 4
	command_radar int 			= 5
	///////////////////////////
	command_user_exit int 		= 11
	command_message int 		= 13
	command_connected int 		= 14
	command_login int 			= 15
	command_ping int 			= 16
	command_pong int 			= 17
	command_autopilot int 		= 18
	command_user_show int 		= 19
	command_user_hide int 		= 20
)

type (
	// Комната
	Room struct {
		Name string
		MoveSnakesTimer int64
		// секции карты, в которых есть части змеек
		SnakeSectors map[int][]int // [][]int // map[int]int
		SnakeDistance map[int]map[int]int64
		SectorCount int
		// Registered connections.
		playerConns map[int]*PlayerConn
		// Update state for all conn.
		updateAll chan bool
		// Register requests from the connections.
		Join chan *PlayerConn
		// Unregister requests from connections.
		leave chan *PlayerConn
		// makes a channel that sends a periodic message
		ticker_MoveBots chan bool
		ticker_SendRadar chan bool
		ticker_SendMoving chan bool
		Apples AppleManager
		Rules RoomRules
		TickValue int64
		Mu *sync.Mutex // чтобы избежать коллизий записи в сокет
	}
	// Правила комнаты
	RoomRules struct {
		ServerName string
		ConnectTypeName string
		KillOnCollisionSnakes bool
		ArenaRadius int
		AppleIntensive int
		StartSnakeSize int
		AddApplesOnCollisionWall bool
	}
	// Менеджер комнат
	RoomManager struct {
		AllRooms map[string]*Room
		FreeRooms map[string]*Room
		RoomsCount int
	}
)

var Rooms RoomManager

func init() {
	Rooms = RoomManager{ make(map[string]*Room),  make(map[string]*Room), 0}
}

func (rm *RoomManager) CalcLength(points int) int {
	sz := math.Sqrt(float64(points)) * 10 / 3
	return int(math.Floor(sz))
}

func (rm *RoomManager) GetFreeRoom(room_rules RoomRules) * Room {
	var room *Room
	if len(rm.FreeRooms) > 0 {
		for _, r := range rm.FreeRooms {
			room = r
			break
		}
	} else {
		room = rm.NewRoom(RoomRules{})
	}
	return room
}

func (rm *RoomManager) DeleteRoom(name string) {
	delete(rm.AllRooms, name)
	delete(rm.FreeRooms, name)
	rm.RoomsCount -= 1
	log.Print("Room closed:", name)
}

func (rm *RoomManager) NewRoom(room_rules RoomRules) *Room {
	name := room_rules.ServerName
	if name == "" {
		name = utils.RandString(7)
	}
	room := &Room{
		Name:        name,
		playerConns: make(map[int]*PlayerConn),
		updateAll:   make(chan bool),
		Join:        make(chan *PlayerConn),
		leave:       make(chan *PlayerConn),
	}
	// инициализация яблок
	room.Apples = AppleManager{}
	if(room_rules.ServerName == "") {
		// Правила и ограничения игры по умолчанию
		room.Rules = RoomRules{}
		room.Rules.KillOnCollisionSnakes = KILL_ON_COLLISION_SNAKES
		room.Rules.AddApplesOnCollisionWall = ADD_APPLES_ON_COLLISION_WALL
		room.Rules.StartSnakeSize = START_SNAKE_SIZE
		room.Rules.ArenaRadius = ARENA_RADIUS
		room.Rules.AppleIntensive = APPLE_INTENSIVE
	} else {
		room.Rules = room_rules
	}
	room.SectorCount = int(math.Pow(float64((room.Rules.ArenaRadius * 2) / cell_size), 2))
    room.SnakeDistance = map[int]map[int]int64{}
	room.Apples.init(room)
	Rooms.AllRooms[name] = room
	Rooms.FreeRooms[name] = room
	// run room
	go room.run()
	Rooms.RoomsCount += 1
	return room
}

func schedule(what func(), delay time.Duration) chan bool {
    stop := make(chan bool)
    go func() {
        for {
            what()
            select {
            case <-time.After(delay):
            case <-stop:
                return
            }
        }
    }()
    return stop
}

// Run the Room in goroutine
func (r *Room) run() {

	r.Mu = &sync.Mutex{}

	r.ticker_MoveBots = schedule(func() {

		// var buffer bytes.Buffer

		pn := r.getTimer()

		// автоматическое управление сервера ботами
		r.MoveBots()
		// buffer.WriteString("MvBot: " + strconv.Itoa(int(r.getTimer() - pn)) + " | ")

		// передвижение змей
		// pn = r.getTimer()
		r.MoveSnakes(pn)
		// buffer.WriteString("MvSnake: " + strconv.Itoa(int(r.getTimer() - pn)) + " | ")

		// обновление видимости врагов
		// pn = r.getTimer()
		r.UpdateEnemyVisibility()
		// buffer.WriteString("UpdEnemy: " + strconv.Itoa(int(r.getTimer() - pn)) + " | ")

		// проверка столкновения объектов игры
		// pn = r.getTimer()
		r.CheckCollision(pn)
		// buffer.WriteString("ChkCollis: " + strconv.Itoa(int(r.getTimer() - pn)) + " | ")

		// log.Println(buffer.String())

		r.TickValue = r.getTimer() - pn
		// log.Println("Tick duration: ", r.TickValue)

	}, 15 * time.Millisecond)

	r.ticker_SendMoving = schedule(func() {
		// отсылка координат, скорости и направления всех змеек всем =)
		r.SendMoving()
	}, 15 * time.Millisecond)

	r.ticker_SendRadar = schedule(func() {
		// отсылка радара всем пользователям
		r.SendRadar()
		// }, time.Duration(arena_radius * arena_radius / 1066666) * time.Millisecond)
	}, 500 * time.Millisecond)

	for {
		select {
		  // подключился новый клиент
	  		case c := <-r.Join:
				r.Mu.Lock()
				// log.Println("new player: ", c.Id)
				// go c.SendMoving()
				r.playerConns[c.Id] = c
				r.Mu.Unlock()
			case c := <-r.leave:
				c.GiveUp()
				delete(r.playerConns, c.Id)
				if len(r.playerConns) == 0 {
					goto Exit
				}
			case <-r.updateAll:
				// r.updateAllPlayers()
		}
	}

Exit:

	r.ticker_MoveBots <- true
	// r.ticker_SendMoving <- true
	r.ticker_SendRadar <- true

	// delete room
	Rooms.DeleteRoom(r.Name)
}

// расчет номера сектора на арене для указанных координат
func (r *Room) CalcCellNumber(x, y int) int {
	arena_radius := r.Rules.ArenaRadius
	if(x < -arena_radius + 1) {x = -arena_radius + 1}
	if(y < -arena_radius + 1) {y = -arena_radius + 1}
	if(x > arena_radius - 1) {x = arena_radius - 1}
	if(y > arena_radius - 1) {y = arena_radius - 1}
	var a = arena_radius * 2
	var x1 = int(math.Floor(float64((x + arena_radius) / cell_size)))
	var y1 = int(math.Floor(float64((y + arena_radius) / cell_size)))
	var cell_number = y1 * (a / cell_size) + x1
	return int(cell_number)
}

func (r *Room) getTimer() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

func (r *Room) GetPlayerById(player_id int) *PlayerConn {
	/*for _, pc := range r.playerConns {
		if(pc != nil) {
			if(pc.Id == player_id) {
				return pc
			}
		}
	}
	return nil
	*/
	r.Mu.Lock()
	defer r.Mu.Unlock()
	if pc, ok := r.playerConns[player_id]; ok {
		return pc
	}
	return nil

}

// отсылка радара всем пользователям
func (r *Room) SendRadar() {
	// точки на радаре
	points := make([][]int, 0)
	arena_radius := r.Rules.ArenaRadius
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		x := int(pc.X / float64(arena_radius) * 100)
		y := int(pc.Y / float64(arena_radius) * 100)
		points = append(points, []int{pc.Id, x, y})
	}
	// ТОП-10
	var top10 Top10List
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		top10 = append(top10, Top10{pc.Login, pc.Size})
	}
	sort.Sort(sort.Reverse(top10))
	var top10_buffer bytes.Buffer
	var cnt int
	for _, u := range top10 {
		n := u.Login
		var color string = "def"
		top10_buffer.WriteString("<" + color + ">" + n + " " + strings.Repeat(".", 25 - len(n)) + " " + strconv.Itoa(u.Size) + "</" + color + ">\n")
		cnt++
		if(cnt == 10) {
			break
		}
	}
	var packets = []JsonResponse{JsonResponse{command_radar, CmdRadarResult{points, top10_buffer.String(), len(points)}}}
	r.SendToAll(packets, true)
}

// смена направления движения ботов
func (r *Room) MoveBots() {
	arena_radius := r.Rules.ArenaRadius
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		if(pc.Autopilot.On) {
			if(pc.Autopilot.BotRotate == 30) {
				pc.Autopilot.BotRotate = 0
				pc.Autopilot.BotRotateValue = rand.Float64() * .3
			}
			if(pc.Autopilot.BotRotate < 15) {
				pc.AngleRadians += rand.Float64() * pc.Autopilot.BotRotateValue
			} else if(pc.Autopilot.BotRotate < 30) {
				pc.AngleRadians -= rand.Float64() * pc.Autopilot.BotRotateValue
			}
			pc.Autopilot.BotRotate += 1
			Sx := pc.X
			Sy := pc.Y
			// расчет вектора
			var (
				x1 float64 = Sx
				y1 float64 = Sy
				x2 float64 = 0
				y2 float64 = 0
				a float64 = math.Atan2(y1 - y2, x1 - x2)
				min_dist float64 = pc.Radius + 50
				arena_radius float64 = float64(arena_radius)
			)
			if(Sx >= float64(arena_radius) - min_dist) { pc.AngleRadians = a }
			if(Sx <= -float64(arena_radius) + min_dist) { pc.AngleRadians = a }
			if(Sy >= float64(arena_radius) - min_dist) { pc.AngleRadians = a }
			if(Sy <= -float64(arena_radius) + min_dist) { pc.AngleRadians = a }
		}
	}
}

// передвижение змей
func (r *Room) MoveSnakes(pn int64) {

	var time float64 = 1
	if(r.MoveSnakesTimer != 0) {
		time = float64(pn - r.MoveSnakesTimer)
	}
	r.MoveSnakesTimer = pn
	time /= 4.5

	// 1. вычисление скорости движения + смена направления движения вслед за курсором
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		// направление движения в сторону указанного направления
		if(!pc.Autopilot.On) {
			var PI float64 = math.Pi
			PI = float64(int(PI * 100000)) / 100000
			a := pc.AngleRadians + PI;
			b := pc.TargetAngleRadians
			c := math.Abs(a - b)
			if(c > 0.034 && c < PI * 2 - 0.034) { // 2 degrees
				var m float64 = 1
				var v float64 = (PI / (45 * pc.Scale / pc.Speed)) * (time / 3.5)
				if(b > a) {
					if(b - a < PI) {
						m = 1
					} else {
						m = -1
					}
				} else if(a > b) {
					if(a - b < PI) {
						m = -1
					} else {
						m = 1
					}
				}
				if(m != 0) {
					a1 := a
					if(m > 0) {
						a1 = a + v
						a1 = float64(int(a1 * 100000) % int(PI * 2 * 100000)) / 100000
						if(a1 > b && a < b) {
							a1 = b
						}
					} else {
						a1 = a - v
						if(a1 < 0) {
							a1 = PI * 2 + a1
						}
						if(a1 < b && a > b) {
							a1 = b
						}
					}
					pc.AngleRadians = float64(int((a1 - PI) * 100)) / 100
				}

			}
		}
		// если ускорен, то уменьшаем длину змеи
		if(pc.Speed > 1) {
			if(pc.Size <= 10) {
				pc.Speed = 1
			}
		}
		vel := time * pc.Speed
		pc.Sx = math.Cos(pc.AngleRadians) * vel
		pc.Sy = math.Sin(pc.AngleRadians) * vel
	}

	// 2. движение хвоста змейки вслед за головой
	step := cell_size / 2

	// секции карты, в которых есть части змеек
	snake_sectors := make(map[int][]int)

	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		if(len(pc.Balls) < 1) {
			continue
		}
		// перемещение последней секции (голова) в новое место
		pc.X -= pc.Sx
		pc.Y -= pc.Sy
		current_snake_sectors := []int{}
		for i := len(pc.Balls) - 1; i > 0; i-- {
			// передвижение секторов тела змейки по прикольному (имитация настоящей змеи)
			ball := pc.Balls[i]
			ball_prev := pc.Balls[i - 1]
			x1 := float64(ball.X)
			y1 := float64(ball.Y)
			x2 := float64(ball_prev.X)
			y2 := float64(ball_prev.Y)
			xdiff := x2 - x1
			ydiff := y2 - y1
			// угол между точками
			d := math.Atan2(y2 - y1, x2 - x1)
			// расстояние между точками
			distance := math.Pow((xdiff * xdiff + ydiff * ydiff), 0.5)
			if (distance > 15) {
				x1 = x2 - math.Cos(d) * 15
				y1 = y2 - math.Sin(d) * 15
				pc.Balls[i].Rotation = ball_prev.Rotation
				pc.Balls[i].X = int(x1)
				pc.Balls[i].Y = int(y1)
				pc.Balls[i].CellNumber = ball_prev.CellNumber
			}
			/*
				// тупое копирование предыдущего сектора тела змейки
				pc.Balls[i].X = pc.Balls[i - 1].X
				pc.Balls[i].Y = pc.Balls[i - 1].Y
				pc.Balls[i].Rotation = pc.Balls[i - 1].Rotation
				pc.Balls[i].CellNumber = pc.Balls[i - 1].CellNumber
			*/
			var exists bool = false
			for j := 0; j < len(current_snake_sectors); j++ {
				if(current_snake_sectors[j] == pc.Balls[i].CellNumber) {
					exists = true
					break
				}
			}
			if(!exists) {
				current_snake_sectors = append(current_snake_sectors, pc.Balls[i].CellNumber)
			}
		}
		pc.Sectors = current_snake_sectors
		for j := 0; j < len(pc.Sectors); j++ {
			sector_id := pc.Sectors[j]
			if _, ok := snake_sectors[sector_id]; ok {
				// do nothing
			} else {
				snake_sectors[sector_id] = []int{}
			}
			snake_sectors[sector_id] = append(snake_sectors[sector_id], pc.Id)
		}
		r.SnakeSectors = snake_sectors
		var i int = 0
		// ориентация головы по направлению движения
		pc.Balls[i].Rotation = pc.AngleRadians - math.Pi / 2
		pc.Balls[i].X = int(pc.X)
		pc.Balls[i].Y = int(pc.Y)
		pc.ActiveCellsChanged = false
		new_head_cell_number := r.CalcCellNumber(int(pc.X), int(pc.Y))
		if(new_head_cell_number != pc.HeadCellNumber) {
			pc.HeadCellNumber = new_head_cell_number
			pc.Balls[i].CellNumber = new_head_cell_number
			active_cells := []int{}
			p := pc.ScreenSize
			x := int(pc.X)
			y := int(pc.Y)
			for x1 := -p; x1 < p; x1 += step {
				for y1 := -p; y1 < p; y1 += step {
					cell_number := r.CalcCellNumber(x + x1, y + y1)
					var exists bool = false
					for j := 0; j < len(active_cells); j++ {
						if(active_cells[j] == cell_number) {
							exists = true
							break
						}
					}
					if(!exists) {
						active_cells = append(active_cells, cell_number)
					}
				}
			}
			pc.ActiveCellsChanged = true
			pc.ActiveCells = active_cells
		}

		var p = int(pc.Radius)
		TouchCells := map[int]bool{}
		x1 := int(pc.X)
		y1 := int(pc.Y)
		for x2 := -p; x2 < p; x2 += p {
			for y2 := -p; y2 < p; y2 += p {
				cell_number := r.CalcCellNumber(x1 + x2, y1 + y2)
				if _, ok := TouchCells[cell_number]; ok {
					// do nothing
				} else {
					TouchCells[cell_number] = true
				}
			}
		}
		pc.TouchCells = TouchCells

		pc.PosPacket.X = pc.X
		pc.PosPacket.Y = pc.Y
		pc.PosPacket.Speed = pc.Speed
		pc.PosPacket.AngleRadians = pc.AngleRadians
	}

}

func (r *Room) KillSnake(reason_id int, pc *PlayerConn, pc_killer *PlayerConn) {
	pc.Gameover = true
	var time = time.Now()
	var create_apples bool = true
	var msg string
	if(reason_id == 1) {
		// столкновение об стену
		msg = pc.Login + " убился об стену"
		create_apples = ADD_APPLES_ON_COLLISION_WALL
	} else if (reason_id == 2) {
		// врезался в другого игрока
		msg = pc.Login + " killed by " + pc_killer.Login
	}
	log.Print(msg)
	var packets = []JsonResponse{}
	packets = append(packets, JsonResponse{command_message, CmdMessage{msg}})
	packets = append(packets, JsonResponse{command_user_exit, CmdUserExit{pc.Id, pc.Login, time}})
    if(create_apples) {
        point_price := int(math.Floor(float64(pc.Size / len(pc.Balls))))
		if(point_price < 1) {
			point_price = 1
		}
        max_total := int(len(pc.Balls) * point_price)
		var dop int
		if (pc.Size > max_total) {
			dop = pc.Size - max_total
		}
		var total int = 0
		for i := 0; i < len(pc.Balls); i++ {
			child := pc.Balls[i]
            price := point_price
            if(i == 0) {
                price += dop
            }
            _, apple_params := r.Apples.Add(child.X, child.Y, point_price)
			packets = append(packets, JsonResponse{command_add_apple, apple_params})
			total += price
			if(total >= max_total) {
				break
			}
		}
	}
	r.SendToAll(packets, false)
}

func (r *Room) SendToAll(packets []JsonResponse, except_killed bool) {
	for _, pc := range r.playerConns {
		if(except_killed && pc.Gameover) {
			continue
		}
		if(!pc.IsLogged) {
			continue
		}
		pc.SendJson(packets)
	}
}

// отсылка координат, скорости и направления всех змеек всем =)
func (r *Room) SendMoving() {
	for _, pc := range r.playerConns {
		pc.SendMoving()
	}
}

func (r *Room) UpdateEnemyVisibility() {

	time := time.Now()

	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		client := *pc.Player
		// список id змеек, которые находятся рядом с текущей змейкой
		enemy_visible_list := map[int]*PlayerConn{}
		// перебираем все сектора, в зоне видимости игрока
		for _, cell_number := range client.ActiveCells {
			if cell, ok := r.SnakeSectors[cell_number]; ok {
				// собираем список всех врагов в данном секторе
				for _, enemy_id := range cell {
					enemy := r.GetPlayerById(enemy_id)
					if(enemy != nil) {
						if(!enemy.Gameover) {
							enemy_visible_list[enemy_id] = enemy
						}
					}
				}
			}
		}

		// если у игрока до этого какая-то змейка из списка текущих видимых не была в поле зрения, то добавляем ее туда и отсылаем игроку информацию о ней
		for enemy_id, enemy := range enemy_visible_list {
			if(enemy_id == pc.Id) {
				continue
			}
			if _, ok := pc.EnemyVisibleList[enemy_id]; ok {
				// do nothing
			} else {
				if(!enemy.Gameover && enemy.IsLogged) {
					// отправляем игроку информацию о новом сопернике в его зоне видимости
					data := CmdUserShow{enemy_id, time, enemy.Login, enemy.X, enemy.Y, enemy.Size, enemy.SkinIndex, enemy.SerializeBalls()}
					var mes = []JsonResponse{JsonResponse{command_user_show, data}}
					pc.Connection.SendJson(mes)
					pc.EnemyVisibleList[enemy_id] = enemy
				}
			}
		}
		// если какая-то змейка пропала из поля видимости игрока, то скрываем ее у него
		for enemy_id, enemy := range client.EnemyVisibleList {
			if(enemy_id == client.Id) {
				continue
			}
			if _, ok := enemy_visible_list[enemy_id]; ok {
				// do nothing
			} else {
				var enemy_login = enemy.Login
				delete(client.EnemyVisibleList, enemy_id)
				data := CmdUserHide{enemy_id, time, enemy_login}
				var mes = []JsonResponse{JsonResponse{command_user_hide, data}}
				pc.Connection.SendJson(mes)
			}
		}
	}

}

// проверка столкновения объектов игры
func (r *Room) CheckCollision(pn int64) {

	var buffer bytes.Buffer

	arena_radius := r.Rules.ArenaRadius

	// 1. столкновение со стенами
	pn2 := r.getTimer()
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		x := pc.X
		y := pc.Y
		min_dist := pc.Radius;
		var crash bool = false
		if(x >= float64(arena_radius) - min_dist) {crash = true}
		if(x <= -float64(arena_radius) + min_dist) {crash = true}
		if(y >= float64(arena_radius) - min_dist) {crash = true}
		if(y <= -float64(arena_radius) + min_dist) {crash = true}
		if(crash) {
			r.KillSnake(1, pc, nil)
		}
	}
	buffer.WriteString("1: " + strconv.Itoa(int(r.getTimer() - pn2)) + " | ")

	// 2. проверка на столкновение змей друг с другом
	pn2 = r.getTimer()
	if(r.Rules.KillOnCollisionSnakes) {
		var need_check bool = true
		for need_check {
			need_check = false
			for _, pc := range r.playerConns {
				if(!pc.IsLogged) { continue }
				if(pc.Gameover) { continue }
	            client := *pc.Player
	            head_cell_number := pc.HeadCellNumber
	            snake_distance := map[int]int64{}
				if value, ok := r.SnakeDistance[pc.Player.Id]; ok {
	                snake_distance = value
	            }
				for enemy_id, enemy := range client.EnemyVisibleList {
					if(enemy.Gameover) {
						continue
					}
					if(enemy_id == pc.Player.Id) {
						continue
					}
	                exists_head_cell_number := false
	                for _, value := range enemy.Sectors {
	                    if(value == head_cell_number) {
	                        exists_head_cell_number = true
	                        break
	                    }
	                }
	                if(!exists_head_cell_number) {
	                    continue
	                }
					// region
					if value, ok := snake_distance[enemy_id]; ok {
						if(value - pn > 100) {
							continue
						}
					}
					// endregion
					var min_dist float64 = 80000
	                for i := 0; i < len(enemy.Balls); i++ {
						if(i >= len(enemy.Balls)) {
							break
						}
						child := enemy.Balls[i]
						x1 := client.X
						y1 := client.Y
						x2 := float64(child.X)
						y2 := float64(child.Y)
						xdiff := x2 - x1
						ydiff := y2 - y1
						// замер расстояния от головы змея до секции вражеской змеи
						distance := math.Pow((xdiff * xdiff + ydiff * ydiff), 0.5)
						if(distance < min_dist) {
							min_dist = distance
						}
						if(distance < (enemy.Radius + client.Radius) / 2) {
							if(r.Rules.KillOnCollisionSnakes) {
								r.KillSnake(2, pc, enemy)
								need_check = true
							}
							break
						}
					}
					// время, когда может произойти столкновения при максимальной скорости обеих змеек в сторону сближения
					// до наступления этого времени можно не рассчитывать расстояния между ними
					snake_distance[enemy_id] = int64(float64(pn) + (min_dist / 888) * 1000)
				}
				r.SnakeDistance[pc.Player.Id] = snake_distance
				if(need_check) {
					break
				}
			}
		}
	}
	buffer.WriteString("2: " + strconv.Itoa(int(r.getTimer() - pn2)) + " | ")

    // 3. отображение и скрытие находящихся рядом яблок на арене игрока по пути его следования
	pn2 = r.getTimer()
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		client := *pc.Player
        if(!client.ActiveCellsChanged) {
			continue
		}
        active_cells := pc.ActiveCells
        // 1. добавление яблок на новых открытых участках
		apples := []JsonResponse{}
		for i := 0; i < len(active_cells); i++ {
            cell_number := active_cells[i]
			if _, ok := client.VisibleCells[cell_number]; ok {
				// do nothing
			} else {
				client.VisibleCells[cell_number] = cell_number
                apple_cell := r.Apples.Cells[cell_number]
				for a := 0; a < len(apple_cell); a++ {
                    apple := apple_cell[a]
                    apple_mes := JsonResponse{command_add_apple, []int{apple.X, apple.Y, apple.Lifes}}
                    apples = append(apples, apple_mes)
                }
            }
        }
		if(len(apples) > 0) {
			pc.SendJson(apples)
		}
        // 2. удаление яблок на скрытых от игрока участках
		message_list := []JsonResponse{}
		for cell_number := range client.VisibleCells {
			var exists bool = false
			for j := 0; j < len(active_cells); j++ {
				if(active_cells[j] == cell_number) {
					exists = true
					break
				}
			}
            if(!exists) {
				delete(client.VisibleCells, cell_number)
                apple_cell := r.Apples.Cells[cell_number]
				for a := 0; a < len(apple_cell); a++ {
                    apple := apple_cell[a]
					eat_mes := JsonResponse{command_eat, []int{0, apple.X, apple.Y, 0}}
					message_list = append(message_list, eat_mes)
                }
            }
        }
		if(len(message_list) > 0) {
			pc.SendJson(message_list)
		}
    }
	buffer.WriteString("3: " + strconv.Itoa(int(r.getTimer() - pn2)) + " | ")

	var chk int
    // 4. проверка столкновения змей с едой
	pn2 = r.getTimer()
	for _, pc := range r.playerConns {
		if(!pc.IsLogged) { continue }
		if(pc.Gameover) { continue }
		client := *pc.Player
		apples_mess := []JsonResponse{}
		min_dist := client.Radius * 2.5
		x1 := client.X
		y1 := client.Y
        ball_add := 0 // количество добавленных секций змейки
        ball_remove := 0 // количество удаленных секций змейки
        if(client.Speed > 1) {
            if(client.Size > 10) {
                if(pn - pc.PrevAddAppleTime > 100) {
                    pc.PrevAddAppleTime = pn
                    ball_remove += 1
                }
            } else {
                pc.Speed = 1
            }
        }
        // перебираем массив находящихся рядом с головой секций
		for cell_number := range pc.TouchCells {
            cell := r.Apples.Cells[cell_number]
            // перебор всех яблок, проверка столкновения змейки с яблоками
            for i := len(cell) - 1; i >= 0; i-- {
				chk++
                x2 := float64(cell[i].X)
                xdiff := x2 - x1
				if(math.Abs(xdiff) < min_dist) {
					y2 := float64(cell[i].Y)
					ydiff := y2 - y1
					if(math.Abs(ydiff) < min_dist) {
		                // замер расстояния от головы змея до яблока
		                distance := math.Pow(xdiff * xdiff + ydiff * ydiff, 0.5);
		                if(distance < min_dist) {
							var apple = cell[i]
		                    ball_add += apple.Lifes;
							apples_mess = append(apples_mess, JsonResponse{command_eat, []int{client.Id, apple.X, apple.Y, apple.Lifes}});
		                    r.Apples.Remove(cell_number, i, 1)
		                }
					}
				}
            }
        }
		// отсылаем информацию о съеденном яблоке игрокам, у которых оно было в поле видимости (тем, кого игрок съевший яблоко видел вокруг себя)
		if(len(apples_mess) > 0) {
			for _, receiver := range client.EnemyVisibleList {
				receiver.Connection.SendJson(apples_mess);
			}
			pc.SendJson(apples_mess)
		}
        if(ball_remove > 0) {
			ball := client.Balls[len(client.Balls) - 1]
            _, added_apple_params := r.Apples.Add(ball.X, ball.Y, ball_remove)
			apple_mess_list := []JsonResponse{JsonResponse{command_add_apple, added_apple_params}}
			for _, receiver := range client.EnemyVisibleList {
				receiver.Connection.SendJson(apple_mess_list);
			}
			pc.SendJson(apple_mess_list)
        }
        if(ball_add - ball_remove != 0) {
			pc.SetPoints(pc.Size + ball_add - ball_remove)
        }
    }
	buffer.WriteString("4: " + strconv.Itoa(int(r.getTimer() - pn2)) + " | ")

	log.Println(buffer.String())

	// log.Println("check apples: ............. ", chk)

}
