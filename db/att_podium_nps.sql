update podium_nps
set owning_tech_pr_id=$1
where technician like $2
