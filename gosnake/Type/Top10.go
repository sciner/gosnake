package Type

type Top10 struct {
    Login string
    Size int
}

type Top10List []Top10

func (slice Top10List) Len() int {
    return len(slice)
}

func (slice Top10List) Less(i, j int) bool {
    return slice[i].Size < slice[j].Size
}

func (slice Top10List) Swap(i, j int) {
    slice[i], slice[j] = slice[j], slice[i]
}
