#! /bin/bash

### monutor.sbatch
### Monutor slurm job. 

### Cosmin Deaconu <cozzyd@kicp.uchicago.edu> 



#Slurm stuff  (ignore if not using slurm) 

#SBATCH --job-name=monutor 
#SBATCH --output=monutor.out 
#SBATCH --error=monutor.err
#SBATCH --time=2:00:00
#SBATCH --partition=kicp
#SBATCH --account=kicp
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1


## Check MONUTOR_DIR and switch to that that if it's defined

MONUTOR_DIR=/home/cozzyd/nuphase/monutor
echo `which gcc` 

if [ -n "$MONUTOR_DIR" ]; then
  cd "$MONUTOR_DIR"; 
fi;

cd ../;
. env.sh 
cd - 

make 

# clear out old files in dest
find /project2/avieregg/nuphase/telem/dest -mtime +30 -delete






        
        



    
















