getting git statistics from bitbucket api

there is a rate limit of 1000 requests per hour, which I've just learned about as I've been developing, after hitting you must wait an hour

TODO
approval might not be on the first page, so need may need to paginate until it is found -- this turned out to be a waste
reduce code duplication/refactor const strings
refactor methods that can be generic
remove duplicate interfaces
make output better, median, diff, diff average, spinner
add error handling for if/when diff is ungettable
