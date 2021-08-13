package main

import (
	"html/template"
	"log"
	"net/http"
	"net/url"
	"sciner/gosnake/Type"
	"sciner/gosnake/game"
	"strconv"
	"sync"

	"github.com/gorilla/websocket"
)

const (
	ADDR             string = ":5556"
	START_SNAKE_SIZE int    = 10
)

func homeHandler(c http.ResponseWriter, r *http.Request) {
	var homeTempl = template.Must(template.ParseFiles("templates/index.html"))
	data := struct {
		Host       string
		Version    string
		Port       int
		RoomsCount int
	}{r.Host, "173", 5556, Type.Rooms.RoomsCount}
	homeTempl.Execute(c, data)
}

func NewPlayerConn(ws *websocket.Conn, player *Type.Player, room *Type.Room) *Type.PlayerConn {
	pc := &Type.PlayerConn{
		Ws:     ws,
		Player: player,
		Room:   room,
		Mu:     &sync.Mutex{},
	}
	go pc.Receiver()
	return pc
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := websocket.Upgrade(w, r, nil, 1024, 1024)
	if _, ok := err.(websocket.HandshakeError); ok {
		http.Error(w, "Not a websocket handshake", 400)
		return
	} else if err != nil {
		return
	}
	room_rules := Type.RoomRules{}
	playerName := "Player"
	params, _ := url.ParseQuery(r.URL.RawQuery)
	if len(params["Login"]) > 0 {
		playerName = params["Login"][0]
	}
	if len(params["ServerName"]) > 0 {
		room_rules.ServerName = params["ServerName"][0]
	}
	if len(params["ConnectTypeName"]) > 0 {
		room_rules.ConnectTypeName = params["ConnectTypeName"][0]
	}
	if len(params["ArenaRadius"]) > 0 {
		ArenaRadius, err := strconv.Atoi(params["ArenaRadius"][0])
		log.Println("ArenaRadius", err, ArenaRadius)
		if err == nil {
			room_rules.ArenaRadius = ArenaRadius
		}
	}
	if len(params["StartSnakeSize"]) > 0 {
		StartSnakeSize, err := strconv.Atoi(params["StartSnakeSize"][0])
		log.Println("StartSnakeSize", err, StartSnakeSize)
		if err == nil {
			room_rules.StartSnakeSize = StartSnakeSize
		}
	}
	if len(params["AppleIntensive"]) > 0 {
		AppleIntensive, err := strconv.Atoi(params["AppleIntensive"][0])
		log.Println("AppleIntensive", err, AppleIntensive)
		if err == nil {
			room_rules.AppleIntensive = AppleIntensive
		}
	}
	if len(params["KillOnCollisionSnakes"]) > 0 {
		KillOnCollisionSnakes, err := strconv.Atoi(params["KillOnCollisionSnakes"][0])
		log.Println("KillOnCollisionSnakes", err, KillOnCollisionSnakes)
		if err == nil {
			room_rules.KillOnCollisionSnakes = KillOnCollisionSnakes == 1
		}
	}
	if len(params["AddApplesOnCollisionWall"]) > 0 {
		AddApplesOnCollisionWall, err := strconv.Atoi(params["AddApplesOnCollisionWall"][0])
		log.Println("AddApplesOnCollisionWall", err, AddApplesOnCollisionWall)
		if err == nil {
			room_rules.AddApplesOnCollisionWall = AddApplesOnCollisionWall == 1
		}
	}
	// log.Println(room_rules)
	// Get or create a room
	var room *Type.Room
	if room_rules.ConnectTypeName == "connect" || room_rules.ConnectTypeName == "" {
		room_rules.ServerName = ""
		room = Type.Rooms.GetFreeRoom(room_rules) // *Type.Room
	} else if room_rules.ConnectTypeName == "enter" {
		for _, r := range Type.Rooms.AllRooms {
			if r.Name == room_rules.ServerName {
				room = r
				break
			}
		}
		if room == nil {
			return
		}
	} else if room_rules.ConnectTypeName == "create" {
		for _, r := range Type.Rooms.AllRooms {
			if r.Name == room_rules.ServerName {
				return
				// exception
			}
		}
		room = Type.Rooms.NewRoom(room_rules)
	} else {
		// exception
	}
	// Create Player and Conn
	player := game.NewPlayer(playerName)
	player.Room = room
	pConn := NewPlayerConn(ws, player, room)
	// Join Player to room
	room.Join <- pConn
	log.Printf("Player: %s has joined to room: %s", pConn.Name, room.Name)
}

func main() {
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/ws", wsHandler)
	// http.HandleFunc("/static/", serveResource)
	fileServer := http.StripPrefix("/static/", http.FileServer(http.Dir("static")))
	http.Handle("/static/", fileServer)
	serveResource := http.StripPrefix("/three/", http.FileServer(http.Dir("three")))
	http.Handle("/three/", serveResource)
	/*http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, r.URL.Path[1:])
	})*/
	log.Println("————————————————————————————————————————————————————————————————————————————————————————————————")
	log.Println("                                       GOSNAKE SERVER RUN                                       ")
	log.Println("————————————————————————————————————————————————————————————————————————————————————————————————")
	log.Printf("    LISTEN ADDRESS ...... localhost%s", ADDR)
	log.Println("————————————————————————————————————————————————————————————————————————————————————————————————")
	if err := http.ListenAndServe(ADDR, nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
