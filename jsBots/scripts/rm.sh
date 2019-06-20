#!/bin/sh
[[ -z $1 ]] || gsutil -m rm gs://ocelot-student-files/ocelot-*/$1
