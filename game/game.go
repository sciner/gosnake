package game

import (
	"math/rand"
	"sciner/gosnake/Type"
)

func NewPlayer(name string) *Type.Player {
	player := &Type.Player{
		Name:  name,
		Login: name,
		Id:    int(rand.Float64() * 999999),
	}
	return player
}
