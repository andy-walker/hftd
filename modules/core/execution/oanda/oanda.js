/**
 * Name: Oanda integration module
 * Description: Broker integration for Oanda platform
 */

"use strict"

class Oanda {

	constructor() {
		console.log('Constructor called');
	}

	disable() {
		console.log('Disable hook called!');
	}

	enable() {
		console.log('Enable hook called!');
	}

	init() {
		console.log('Init hook called');
	}

	install() {
		console.log('Install hook called!');
	}

	uninstall() {
		console.log('Uninstall hook called!');
	}

}

module.exports = () => new Oanda();