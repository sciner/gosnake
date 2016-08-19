package Type

import (
	"math/rand"
	"math"
	"log"
)

type (
	Apple struct {
		X int
		Y int
		Lifes int
	}
	AppleManager struct {
		ApplesInitCount int
        list []Apple
        Cells [][]Apple
		Room *Room
	}
)

func (am *AppleManager) init(room *Room) {
	am.Room = room
	arena_radius := am.Room.Rules.ArenaRadius
	apple_intensive := am.Room.Rules.AppleIntensive
	var cells_count = int(math.Pow(float64((arena_radius * 2) / cell_size), 2))
	log.Println(cells_count)
	log.Println("am.Cells count:", cells_count)
	for i := 0; i < cells_count; i++ {
		am.Cells = append(am.Cells, []Apple{})
	}
	am.ApplesInitCount = arena_radius * arena_radius / 5000 * apple_intensive
	log.Println("am.Apples init count:", am.ApplesInitCount)
	for i := 0; i < am.ApplesInitCount; i++ {
		am.Generate()
	}
}

func (am *AppleManager) Generate() Apple {
	arena_radius := am.Room.Rules.ArenaRadius
	arad := float64(arena_radius - 50)
	x := int(rand.Float64() * arad * 2 - arad)
	y := int(rand.Float64() * arad * 2 - arad)
	resp, _ := am.Add(x, y, 1)
	return resp
}

func (am *AppleManager) Add(x, y, lifes int) (apple Apple, params []int) {
	apple = Apple{x, y, lifes}
	params = []int{apple.X, apple.Y, apple.Y}
	am.list = append(am.list, apple)
	// расчет номера сектора на арене для указанных координат
	var cell_number = am.Room.CalcCellNumber(x, y)
	am.Cells[cell_number] = append(am.Cells[cell_number], apple)
	return
}

func (am *AppleManager) getList(x, y int) []Apple {
	return am.list
}

func (am *AppleManager) Remove(cell_number, offset, count int) {
	cell := am.Cells[cell_number]
	if(offset < len(cell) - 1) {
		copy(cell[offset:], cell[offset+1:])
	}
	am.Cells[cell_number] = cell[:len(cell)-1]
}
