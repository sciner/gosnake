package game

import (
	"gosnake/Type"
	"math/rand"
)

func NewPlayer(name string) *Type.Player {
	player := &Type.Player{
		Name: name,
		Login: name,
		Id: int(rand.Float64() * 999999),
	}
	return player
}
