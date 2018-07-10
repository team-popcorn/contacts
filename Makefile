all: dev-setup lint build-js-production test

dev-setup: clean clean-dev npm-init

npm-init:
	npm install

npm-update:
	npm update

build-js:
	npm run dev

build-js-production:
	npm run build

watch-js:
	npm run watch

test:
	npm run test

test-coverage:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

clean:
	rm -f js/contacts.js
	rm -f js/contacts.js.map

clean-dev:
	rm -rf node_modules

