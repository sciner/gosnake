rem go build -o %GOPATH%\src\gosnake\gosnake.exe -v gosnake && start cmd /k "cd %GOPATH%\src\gosnake\ && .\gosnake.exe >run.log 2>&1"
go build -o %GOPATH%\src\gosnake\gosnake.exe -v gosnake && start cmd /k "cd %GOPATH%\src\gosnake\ && .\gosnake.exe"
pause 
