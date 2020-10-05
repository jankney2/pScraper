update podium_nps
set owning_tech_payloc_id=$1


where lower(technician) like lower($2)


