#!/bin/bash

set -xeu

DIR=/PWD/
#${PWD}
#DIR=http://localhost:8000

FA=${DIR}S_lycopersicum_chromosomes.2.50.fa

BED=${DIR}exp_refineFinal1_merged_r.cmap.bed

BIGBED=${BED/.bed/.bb}

SIZES=${FA}.sizes


#if [[ ! -f "${SIZES}" ]]; then
#    ./gen_sizes.py ${FA}
#fi

#./bedToBigBed_static -tab ${BED} ${SIZES} ${BIGBED}

node bedToBigBed_static.js -tab ${BED} ${SIZES} ${BIGBED}
