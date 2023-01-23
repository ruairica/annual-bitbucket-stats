getting git statistics from bitbucket api

there is a rate limit of 1000 requests per hour, which I've just learned about as I've been developing, after hitting you must wait an hour

TODO
change number of PR's reviewed to include PR's approved OR commented on -- done
add inputs of branch names to check for diffs -- done
move functions to separate files -- done NEEDS TESTED
approval might not be on the first page, so need may need to paginate until it is found????
reduce code duplication/refactor const strings
make output better
Check how much of the diff was for tests?
add error handling for if/when diff is ungettable
