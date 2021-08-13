SET GOARCH=amd64
SET GOOS=linux
go build -o %GOPATH%\src\gosnake\gosnake.elf -v gosnake
pause
