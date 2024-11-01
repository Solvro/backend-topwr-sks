#!/bin/sh

# Start the server
node ./bin/server.js &

# Start the scheduler
node ace scheduler:run &

# Wait for any process to exit
wait -n

# Exit with the status of the process that exited first
exit $?
