#!/bin/bash


# specify the time limit for the cron job
#SBATCH --time=00:01:00

# use cron.log and append to it
#SBATCH --output=cron.log
#SBATCH --open-mode=append

# the account, partition, and qos should not be changed
#SBATCH --account=cron-account
#SBATCH --partition=cron2
#SBATCH --job-name=monutor_cron
#SBATCH --qos=cron

# Specify a valid cron string for the schedule
# this is every two hours
SCHEDULE='5 */2 * * *'


#cancel any other script if there is one already
scancel --name monutor 
sbatch -A pi-avieregg -p broadwl monutor.sbatch 

# resubmit this script with --begin set to the next scheduled cron time
# next-cron-time is a script that parses a cron schedule string and returns
# the next execution time

sbatch --quiet --begin=$(next-cron-time "$SCHEDULE") -A cron-account -p cron monutor_cron.sbatch
