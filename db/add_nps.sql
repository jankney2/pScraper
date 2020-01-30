insert into podium_nps (
    invite_date, 
    response_date, 
    phone, 
    office, 
    technician, 
    customer, 
    rating, 
    comment, 
    date_added, 
    json_string
)values (
    $1, 
    $2, 
    $3, 
    $4, 
    $5, 
    $6, 
    $7, 
    $8, 
    current_date, 
    $9
)on conflict(json_string)
do update set 
    invite_date=$1, 
    response_date=$2, 
    phone=$3, 
    office=$4, 
    technician=$5, 
    customer=$6, 
    rating=$7, 
    comment=$8 
where podium_nps.json_string=$9

