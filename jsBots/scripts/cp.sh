#!/bin/sh
if [[ ! -z $1 ]]; then
  for i in {1..15}; do
    gsutil -h "Content-Type:text/javascript" cp ../programs/$1 gs://ocelot-student-files/ocelot-$i@cs.umass.edu/
  done
fi
