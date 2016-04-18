#!/usr/bin/env python

import os
import sys

def main():
    infile = sys.argv[1]
    oufile = infile + '.sizes'
    
    data   = []
    with open(infile, 'r') as fhd:
        for line in fhd:
            line = line.strip()
            if len(line) == 0:
                continue

            if line[0] == ">":
                chrom_name = line[1:].split(" ")[0]
                data.append([ chrom_name, 0 ])
            else:
                data[-1][1] += len(line)

    with open(oufile, 'w') as fhd:
        for chrom_name, chrom_len in data:
            print chrom_name, chrom_len
            fhd.write("%s %d\n"%(chrom_name, chrom_len))


if __name__ == "__main__":
    main()
