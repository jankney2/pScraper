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
do nothing