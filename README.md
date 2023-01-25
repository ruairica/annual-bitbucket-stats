getting annual git statistics from bitbucket api

Limitations: There is a rate limit of 1000 requests per hour on certain resources from the Bitbucket API so you may only be able to run this program a couple of times before being rate limited (it will error out).
This is mainly because there isn't an easy to way to get all the pull requests a user reviewed (commented on/approved).
TODO
add comments on where to create app password/ get username
Add error handling
Make this a package runnable from the command line.
