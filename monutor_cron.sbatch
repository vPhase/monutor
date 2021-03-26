#!/bin/bash


# specify the time limit for the cron job
#SBATCH --time=00:05:00

# use cron.log and append to it
#SBATCH --output=cron.log
#SBATCH --open-mode=append

# the account, partition, and qos should not be changed
#SBATCH --account=cron-account
#SBATCH --partition=cron
#SBATCH --job-name=monutor_cron
#SBATCH --qos=cron

####     #SBATCH --nodelist=midway-login1

# Specify a valid cron string for the schedule
# this is every two hours
SCHEDULE='19 */2 * * *'

module unload slurm 
module load slurm 

sbatch --begin=$(next-cron-time "$SCHEDULE") -A cron-account -p cron monutor_cron.sbatch


#cancel any other script if there is one already
scancel --name monutor 
echo about to submit monutor at `date`
sbatch -A kicpaa -p kicpaa monutor.sbatch 

# resubmit this script with --begin set to the next scheduled cron time
# next-cron-time is a script that parses a cron schedule string and returns
# the next execution time

