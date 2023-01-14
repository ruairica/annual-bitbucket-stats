getting git statistics from bitbucket api

TODO:
get number of merged pull requests for the year for user -- DONE test speed vs promis.all()
get diffStats for all my merged pull requests -- -- DONE
refactor ^ to be more async -- DONE
get number of comments on pull requests for repo, go through all repos i merged in -- DONE
refactor to use promise.all -- DONE

Think diffstat might be broken

refactor to only check pull requests going into main/develop/release as if destination branch is deleted there is no diff
possibly get diff stats per repo???
make variables for year, workspace etc
