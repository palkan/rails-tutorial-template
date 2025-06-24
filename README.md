# Rails in-browser tutorial template

> Try to code some Ruby on Rails on Stackblitz: https://stackblitz.com/~/github.com/palkan/rails-tutorial-template

This is a complete Ruby on [Rails Getting Started Tutorial](https://guides.rubyonrails.org/getting_started.html) that can be run within an in-browser development environment such as Stackblitz.

## Usage

First, install the Node dependencies:

```
npm install
```

Then, go to the `./rails` folder and run some Rails commands. Start with the database setup:

```sh
bin/rails db:prepare
```

Now you can run a server!

```sh
bin/rails s
```

Use the following credentials to log in: `you@rails.test | qwerty`.

Try running a Rails console or tests:

```sh
bin/rails c

bin/rails test
```
