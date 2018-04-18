#!/bin/bash
echo 'Start Import address to database';

mongoimport --db loopback --collection Province < ./addressInformation/province.json
mongoimport --db loopback --collection District < ./addressInformation/district.json
mongoimport --db loopback --collection Amphur < ./addressInformation/amphur.json
