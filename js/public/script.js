/**
 * Nextcloud - contacts
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Hendrik Leppelsack <hendrik@leppelsack.de>
 * @copyright Hendrik Leppelsack 2015
 */

angular.module('contactsApp', ['uuid4', 'angular-cache', 'ngRoute', 'ui.bootstrap', 'ui.select', 'ngSanitize', 'angular-click-outside', 'ngclipboard'])
.config(['$routeProvider', function($routeProvider) {

	$routeProvider.when('/:gid', {
		template: '<contactdetails></contactdetails>'
	});

	$routeProvider.when('/contact/:uid', {
		redirectTo: function(parameters) {
			return '/' + t('contacts', 'All contacts') + '/' + parameters.uid;
		}
	});

	$routeProvider.when('/:gid/:uid', {
		template: '<contactdetails></contactdetails>'
	});

	$routeProvider.otherwise('/' + t('contacts', 'All contacts'));

}]);

angular.module('contactsApp')
.directive('datepicker', ['$timeout', function($timeout) {
	var loadDatepicker = function (scope, element, attrs, ngModelCtrl) {
		$timeout(function() {
			element.datepicker({
				dateFormat:'yy-mm-dd',
				minDate: null,
				maxDate: null,
				constrainInput: false,
				onSelect:function (date, dp) {
					if (dp.selectedYear < 1000) {
						date = '0' + date;
					}
					if (dp.selectedYear < 100) {
						date = '0' + date;
					}
					if (dp.selectedYear < 10) {
						date = '0' + date;
					}
					ngModelCtrl.$setViewValue(date);
					scope.$apply();
				}
			});
		});
	};
	return {
		restrict: 'A',
		require : 'ngModel',
		transclude: true,
		link : loadDatepicker
	};
}]);

angular.module('contactsApp')
.directive('focusExpression', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: {
			post: function postLink(scope, element, attrs) {
				scope.$watch(attrs.focusExpression, function () {
					if (attrs.focusExpression) {
						if (scope.$eval(attrs.focusExpression)) {
							$timeout(function () {
								if (element.is('input')) {
									element.focus();
								} else {
									element.find('input').focus();
								}
							}, 100); //need some delay to work with ng-disabled
						}
					}
				});
			}
		}
	};
}]);

angular.module('contactsApp')
.directive('inputresize', function() {
	return {
		restrict: 'A',
		link : function (scope, element) {
			var elInput = element.val();
			element.bind('keydown keyup load focus', function() {
				elInput = element.val();
				// If set to 0, the min-width css data is ignored
				var length = elInput.length > 1 ? elInput.length : 1;
				element.attr('size', length);
			});
		}
	};
});

angular.module('contactsApp')
.directive('selectExpression', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: {
			post: function postLink(scope, element, attrs) {
				scope.$watch(attrs.selectExpression, function () {
					if (attrs.selectExpression) {
						if (scope.$eval(attrs.selectExpression)) {
							$timeout(function () {
								if (element.is('input')) {
									element.select();
								} else {
									element.find('input').select();
								}
							}, 100); //need some delay to work with ng-disabled
						}
					}
				});
			}
		}
	};
}]);

angular.module('contactsApp')
.controller('addressbookCtrl', ['$scope', 'AddressBookService', function($scope, AddressBookService) {
	var ctrl = this;

	ctrl.t = {
		download: t('contacts', 'Download'),
		copyURL: t('contacts', 'Copy link'),
		clickToCopy: t('contacts', 'Click to copy the link to your clipboard'),
		shareAddressbook: t('contacts', 'Toggle sharing'),
		deleteAddressbook: t('contacts', 'Delete'),
		renameAddressbook: t('contacts', 'Rename'),
		shareInputPlaceHolder: t('contacts', 'Share with users or groups'),
		delete: t('contacts', 'Delete'),
		canEdit: t('contacts', 'can edit'),
		close: t('contacts', 'Close'),
		enabled: t('contacts', 'Enabled'),
		disabled: t('contacts', 'Disabled')
	};

	ctrl.editing = false;
	ctrl.enabled = ctrl.addressBook.enabled;

	ctrl.tooltipIsOpen = false;
	ctrl.tooltipTitle = ctrl.t.clickToCopy;
	ctrl.showInputUrl = false;

	ctrl.clipboardSuccess = function() {
		ctrl.tooltipIsOpen = true;
		ctrl.tooltipTitle = t('core', 'Copied!');
		_.delay(function() {
			ctrl.tooltipIsOpen = false;
			ctrl.tooltipTitle = ctrl.t.clickToCopy;
		}, 3000);
	};

	ctrl.clipboardError = function() {
		ctrl.showInputUrl = true;
		if (/iPhone|iPad/i.test(navigator.userAgent)) {
			ctrl.InputUrlTooltip = t('core', 'Not supported!');
		} else if (/Mac/i.test(navigator.userAgent)) {
			ctrl.InputUrlTooltip = t('core', 'Press ⌘-C to copy.');
		} else {
			ctrl.InputUrlTooltip = t('core', 'Press Ctrl-C to copy.');
		}
		$('#addressBookUrl_'+ctrl.addressBook.ctag).select();
	};

	ctrl.renameAddressBook = function() {
		AddressBookService.rename(ctrl.addressBook, ctrl.addressBook.displayName);
		ctrl.editing = false;
	};

	ctrl.edit = function() {
		ctrl.editing = true;
	};

	ctrl.closeMenus = function() {
		$scope.$parent.ctrl.openedMenu = false;
	};

	ctrl.openMenu = function(index) {
		ctrl.closeMenus();
		$scope.$parent.ctrl.openedMenu = index;
	};

	ctrl.toggleMenu = function(index) {
		if ($scope.$parent.ctrl.openedMenu === index) {
			ctrl.closeMenus();
		} else {
			ctrl.openMenu(index);
		}
	};

	ctrl.toggleSharesEditor = function() {
		ctrl.editingShares = !ctrl.editingShares;
		ctrl.selectedSharee = null;
	};

	/* From Calendar-Rework - js/app/controllers/calendarlistcontroller.js */
	ctrl.findSharee = function (val) {
		return $.get(
			OC.linkToOCS('apps/files_sharing/api/v1') + 'sharees',
			{
				format: 'json',
				search: val.trim(),
				perPage: 200,
				itemType: 'principals'
			}
		).then(function(result) {
			var users   = result.ocs.data.exact.users.concat(result.ocs.data.users);
			var groups  = result.ocs.data.exact.groups.concat(result.ocs.data.groups);

			var userShares = ctrl.addressBook.sharedWith.users;
			var userSharesLength = userShares.length;

			var groupsShares = ctrl.addressBook.sharedWith.groups;
			var groupsSharesLength = groupsShares.length;
			var i, j;

			// Filter out current user
			for (i = 0 ; i < users.length; i++) {
				if (users[i].value.shareWith === OC.currentUser) {
					users.splice(i, 1);
					break;
				}
			}

			// Now filter out all sharees that are already shared with
			for (i = 0; i < userSharesLength; i++) {
				var shareUser = userShares[i];
				for (j = 0; j < users.length; j++) {
					if (users[j].value.shareWith === shareUser.id) {
						users.splice(j, 1);
						break;
					}
				}
			}

			// Now filter out all groups that are already shared with
			for (i = 0; i < groupsSharesLength; i++) {
				var sharedGroup = groupsShares[i];
				for (j = 0; j < groups.length; j++) {
					if (groups[j].value.shareWith === sharedGroup.id) {
						groups.splice(j, 1);
						break;
					}
				}
			}

			// Combine users and groups
			users = users.map(function(item) {
				return {
					display: _.escape(item.value.shareWith),
					type: OC.Share.SHARE_TYPE_USER,
					identifier: item.value.shareWith
				};
			});

			groups = groups.map(function(item) {
				return {
					display: _.escape(item.value.shareWith) + ' (group)',
					type: OC.Share.SHARE_TYPE_GROUP,
					identifier: item.value.shareWith
				};
			});

			return groups.concat(users);
		});
	};

	ctrl.onSelectSharee = function (item) {
		// Prevent settings to slide down
		$('#app-settings-header > button').data('apps-slide-toggle', false);
		_.delay(function() {
			$('#app-settings-header > button').data('apps-slide-toggle', '#app-settings-content');
		}, 500);

		ctrl.selectedSharee = null;
		AddressBookService.share(ctrl.addressBook, item.type, item.identifier, false, false).then(function() {
			$scope.$apply();
		});

	};

	ctrl.updateExistingUserShare = function(userId, writable) {
		AddressBookService.share(ctrl.addressBook, OC.Share.SHARE_TYPE_USER, userId, writable, true).then(function() {
			$scope.$apply();
		});
	};

	ctrl.updateExistingGroupShare = function(groupId, writable) {
		AddressBookService.share(ctrl.addressBook, OC.Share.SHARE_TYPE_GROUP, groupId, writable, true).then(function() {
			$scope.$apply();
		});
	};

	ctrl.unshareFromUser = function(userId) {
		AddressBookService.unshare(ctrl.addressBook, OC.Share.SHARE_TYPE_USER, userId).then(function() {
			$scope.$apply();
		});
	};

	ctrl.unshareFromGroup = function(groupId) {
		AddressBookService.unshare(ctrl.addressBook, OC.Share.SHARE_TYPE_GROUP, groupId).then(function() {
			$scope.$apply();
		});
	};

	ctrl.deleteAddressBook = function() {
		AddressBookService.delete(ctrl.addressBook).then(function() {
			$scope.$apply();
		});
	};

	ctrl.toggleState = function() {
		AddressBookService.toggleState(ctrl.addressBook).then(function(addressBook) {
			ctrl.enabled = addressBook.enabled;
			$scope.$apply();
		});
	};

}]);

angular.module('contactsApp')
.directive('addressbook', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'addressbookCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			addressBook: '=data',
			list: '='
		},
		templateUrl: OC.linkTo('contacts', 'templates/addressBook.html')
	};
});

angular.module('contactsApp')
.controller('addressbooklistCtrl', ['$scope', 'AddressBookService', function($scope, AddressBookService) {
	var ctrl = this;

	ctrl.loading = true;
	ctrl.openedMenu = false;
	ctrl.addressBookRegex = /^[a-zA-Z0-9À-ÿ\s-_.!?#|()]+$/i;

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;
		ctrl.loading = false;
		if(ctrl.addressBooks.length === 0) {
			AddressBookService.create(t('contacts', 'Contacts')).then(function() {
				AddressBookService.getAddressBook(t('contacts', 'Contacts')).then(function(addressBook) {
					ctrl.addressBooks.push(addressBook);
					$scope.$apply();
				});
			});
		}
	});

	ctrl.t = {
		addressBookName : t('contacts', 'Address book name'),
		regexError : t('contacts', 'Only these special characters are allowed: -_.!?#|()')
	};

	ctrl.createAddressBook = function() {
		if(ctrl.newAddressBookName) {
			AddressBookService.create(ctrl.newAddressBookName).then(function() {
				AddressBookService.getAddressBook(ctrl.newAddressBookName).then(function(addressBook) {
					ctrl.addressBooks.push(addressBook);
					$scope.$apply();
				});
			}).catch(function() {
				OC.Notification.showTemporary(t('contacts', 'Address book could not be created.'));
			});
		}
	};
}]);

angular.module('contactsApp')
.directive('addressbooklist', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'addressbooklistCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/addressBookList.html')
	};
});

angular.module('contactsApp')
.controller('avatarCtrl', ['ContactService', function(ContactService) {
	var ctrl = this;

	ctrl.import = ContactService.import.bind(ContactService);

	ctrl.removePhoto = function() {
		ctrl.contact.removeProperty('photo', ctrl.contact.getProperty('photo'));
		ContactService.update(ctrl.contact);
		$('avatar').removeClass('maximized');
	};

	ctrl.downloadPhoto = function() {
		/* globals ArrayBuffer, Uint8Array */
		var img = document.getElementById('contact-avatar');
		// atob to base64_decode the data-URI
		var imageSplit = img.src.split(',');
		// "data:image/png;base64" -> "png"
		var extension = '.' + imageSplit[0].split(';')[0].split('/')[1];
		var imageData = atob(imageSplit[1]);
		// Use typed arrays to convert the binary data to a Blob
		var arrayBuffer = new ArrayBuffer(imageData.length);
		var view = new Uint8Array(arrayBuffer);
		for (var i=0; i<imageData.length; i++) {
			view[i] = imageData.charCodeAt(i) & 0xff;
		}
		var blob = new Blob([arrayBuffer], {type: 'application/octet-stream'});

		// Use the URL object to create a temporary URL
		var url = (window.webkitURL || window.URL).createObjectURL(blob);

		var a = document.createElement('a');
		document.body.appendChild(a);
		a.style = 'display: none';
		a.href = url;
		a.download = ctrl.contact.uid() + extension;
		a.click();
		window.URL.revokeObjectURL(url);
		a.remove();
	};

	ctrl.openPhoto = function() {
		$('avatar').toggleClass('maximized');
	};

	ctrl.t = {
		uploadNewPhoto : t('contacts', 'Upload new image'),
		deletePhoto : t('contacts', 'Delete'),
		closePhoto : t('contacts', 'Close'),
		downloadPhoto : t('contacts', 'Download')
	};

	// Quit avatar preview
	$('avatar').click(function() {
		$('avatar').removeClass('maximized');
	});
	$('avatar img, avatar .avatar-options').click(function(e) {
		e.stopPropagation();
	});
	$(document).keyup(function(e) {
		if (e.keyCode === 27) {
			$('avatar').removeClass('maximized');
		}
	});

}]);

angular.module('contactsApp')
.directive('avatar', ['ContactService', function(ContactService) {
	return {
		scope: {
			contact: '=data'
		},
		controller: 'avatarCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contact: '=data'
		},
		link: function(scope, element) {
			var input = element.find('input');
			input.bind('change', function() {
				var file = input.get(0).files[0];
				if (file.size > 1024*1024) { // 1 MB
					OC.Notification.showTemporary(t('contacts', 'The selected image is too big (max 1MB)'));
				} else {
					var reader = new FileReader();

					reader.addEventListener('load', function () {
						scope.$apply(function() {
							scope.contact.photo(reader.result);
							ContactService.update(scope.contact);
						});
					}, false);

					if (file) {
						reader.readAsDataURL(file);
					}
				}
			});
		},
		templateUrl: OC.linkTo('contacts', 'templates/avatar.html')
	};
}]);

angular.module('contactsApp')
.controller('contactCtrl', ['$route', '$routeParams', 'SortByService', function($route, $routeParams, SortByService) {
	var ctrl = this;

	ctrl.t = {
		errorMessage : t('contacts', 'This card is corrupted and has been fixed. Please check the data and trigger a save to make the changes permanent.'),
	};

	ctrl.getName = function() {
		// If lastName equals to firstName then none of them is set
		if (ctrl.contact.lastName() === ctrl.contact.firstName()) {
			return ctrl.contact.displayName();
		}

		if (SortByService.getSortByKey() === 'sortLastName') {
			return (
				ctrl.contact.lastName()
				+ (ctrl.contact.firstName() ? ', ' : '')
				+ ctrl.contact.firstName() + ' '
				+ ctrl.contact.additionalNames()
			).trim();
		}

		if (SortByService.getSortByKey() === 'sortFirstName') {
			return (
				ctrl.contact.firstName() + ' '
				+ ctrl.contact.additionalNames() + ' '
				+ ctrl.contact.lastName()
			).trim();
		}

		return ctrl.contact.displayName();
	};
}]);


angular.module('contactsApp')
.directive('contact', function() {
	return {
		scope: {},
		controller: 'contactCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contact: '=data'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contact.html')
	};
});

angular.module('contactsApp')
.controller('contactdetailsCtrl', ['ContactService', 'AddressBookService', 'vCardPropertiesService', '$route', '$routeParams', '$scope', function(ContactService, AddressBookService, vCardPropertiesService, $route, $routeParams, $scope) {

	var ctrl = this;

	ctrl.init = true;
	ctrl.loading = false;
	ctrl.show = false;

	ctrl.clearContact = function() {
		$route.updateParams({
			gid: $routeParams.gid,
			uid: undefined
		});
		ctrl.show = false;
		ctrl.contact = undefined;
	};

	ctrl.uid = $routeParams.uid;
	ctrl.t = {
		noContacts : t('contacts', 'No contacts in here'),
		placeholderName : t('contacts', 'Name'),
		placeholderOrg : t('contacts', 'Organization'),
		placeholderTitle : t('contacts', 'Title'),
		selectField : t('contacts', 'Add field …'),
		download : t('contacts', 'Download'),
		delete : t('contacts', 'Delete'),
		save : t('contacts', 'Save changes'),
		addressBook : t('contacts', 'Address book'),
		loading : t('contacts', 'Loading contacts …')
	};

	ctrl.fieldDefinitions = vCardPropertiesService.fieldDefinitions;
	ctrl.focus = undefined;
	ctrl.field = undefined;
	ctrl.addressBooks = [];

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;

		if (!angular.isUndefined(ctrl.contact)) {
			ctrl.addressBook = _.find(ctrl.addressBooks, function(book) {
				return book.displayName === ctrl.contact.addressBookId;
			});
		}
		ctrl.init = false;
		// Start watching for ctrl.uid when we have addressBooks, as they are needed for fetching
		// full details.
		$scope.$watch('ctrl.uid', function(newValue) {
			ctrl.changeContact(newValue);
		});
	});


	ctrl.changeContact = function(uid) {
		if (typeof uid === 'undefined') {
			ctrl.show = false;
			$('#app-navigation-toggle').removeClass('showdetails');
			return;
		}
		ctrl.loading = true;
		ContactService.getById(ctrl.addressBooks, uid).then(function(contact) {
			if (angular.isUndefined(contact)) {
				ctrl.clearContact();
				return;
			}
			ctrl.contact = contact;
			ctrl.show = true;
			ctrl.loading = false;
			$('#app-navigation-toggle').addClass('showdetails');

			ctrl.addressBook = _.find(ctrl.addressBooks, function(book) {
				return book.displayName === ctrl.contact.addressBookId;
			});
		});
	};

	ctrl.deleteContact = function() {
		ContactService.delete(ctrl.addressBook, ctrl.contact);
		ctrl.selectNearestContact(ev.uid);
	};

	ctrl.addField = function(field) {
		var defaultValue = vCardPropertiesService.getMeta(field).defaultValue || {value: ''};
		ctrl.contact.addProperty(field, defaultValue);
		ctrl.focus = field;
		ctrl.field = '';
	};

	ctrl.deleteField = function (field, prop) {
		ctrl.contact.removeProperty(field, prop);
		ctrl.focus = undefined;
	};

	ctrl.changeAddressBook = function (addressBook, oldAddressBook) {
		ContactService.moveContact(ctrl.contact, addressBook, oldAddressBook);
	};

	ctrl.updateContact = function() {
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.closeMenus = function() {
		ctrl.openedMenu = false;
	};

	ctrl.openMenu = function(index) {
		ctrl.closeMenus();
		ctrl.openedMenu = index;
	};

	ctrl.toggleMenu = function(index) {
		if (ctrl.openedMenu === index) {
			ctrl.closeMenus();
		} else {
			ctrl.openMenu(index);
		}
	};
}]);

angular.module('contactsApp')
.directive('contactdetails', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'contactdetailsCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/contactDetails.html')
	};
});

angular.module('contactsApp')
.controller('contactfilterCtrl', function() {
	// eslint-disable-next-line no-unused-vars
	var ctrl = this;
});

angular.module('contactsApp')
.directive('contactFilter', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'contactfilterCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contactFilter: '=contactFilter'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactFilter.html')
	};
});

angular.module('contactsApp')
.controller('contactimportCtrl', ['ContactService', 'AddressBookService', '$timeout', '$scope', function(ContactService, AddressBookService, $timeout, $scope) {
	var ctrl = this;

	ctrl.t = {
		importText : t('contacts', 'Import into'),
		importingText : t('contacts', 'Importing...'),
		selectAddressbook : t('contacts', 'Select your addressbook'),
		importdisabled : t('contacts', 'Import is disabled because no writable address book had been found.')
	};

	ctrl.import = ContactService.import.bind(ContactService);
	ctrl.loading = true;
	ctrl.importText = ctrl.t.importText;
	ctrl.importing = false;
	ctrl.loadingClass = 'icon-upload';

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;
		ctrl.loading = false;
		ctrl.selectedAddressBook = AddressBookService.getDefaultAddressBook();
	});

	AddressBookService.registerObserverCallback(function() {
		$timeout(function() {
			$scope.$apply(function() {
				ctrl.selectedAddressBook = AddressBookService.getDefaultAddressBook();
			});
		});
	});

	ctrl.stopHideMenu = function(isOpen) {
		if(isOpen) {
			// disabling settings bind
			$('#app-settings-header > button').data('apps-slide-toggle', false);
		} else {
			// reenabling it
			$('#app-settings-header > button').data('apps-slide-toggle', '#app-settings-content');
		}
	};

}]);

angular.module('contactsApp')
.directive('contactimport', ['ContactService', 'ImportService', '$rootScope', function(ContactService, ImportService, $rootScope) {
	return {
		link: function(scope, element, attrs, ctrl) {
			var input = element.find('input');
			input.bind('change', function() {
				angular.forEach(input.get(0).files, function(file) {
					var reader = new FileReader();

					reader.addEventListener('load', function () {
						scope.$apply(function () {
							// Indicate the user we started something
							ctrl.importText = ctrl.t.importingText;
							ctrl.loadingClass = 'icon-loading-small';
							ctrl.importing = true;
							$rootScope.importing = true;

							ContactService.import.call(ContactService, reader.result, file.type, ctrl.selectedAddressBook, function (progress, user) {
								if (progress === 1) {
									ctrl.importText = ctrl.t.importText;
									ctrl.loadingClass = 'icon-upload';
									ctrl.importing = false;
									$rootScope.importing = false;
									ImportService.importPercent = 0;
									ImportService.importing = false;
									ImportService.importedUser = '';
									ImportService.selectedAddressBook = '';
								} else {
									// Ugly hack, hide sidebar on import & mobile
									// Simulate click since we can't directly access snapper
									if($(window).width() <= 768 && $('body').hasClass('snapjs-left')) {
										$('#app-navigation-toggle').click();
										$('body').removeClass('snapjs-left');
									}

									ImportService.importPercent = parseInt(Math.floor(progress * 100));
									ImportService.importing = true;
									ImportService.importedUser = user;
									ImportService.selectedAddressBook = ctrl.selectedAddressBook.displayName;
								}
								scope.$apply();

								/* Broadcast service update */
								$rootScope.$broadcast('importing', true);
							});
						});
					}, false);

					if (file) {
						reader.readAsText(file);
					}
				});
				input.get(0).value = '';
			});
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactImport.html'),
		controller: 'contactimportCtrl',
		controllerAs: 'ctrl'
	};
}]);

angular.module('contactsApp')
.controller('contactlistCtrl', ['$scope', '$filter', '$route', '$routeParams', '$timeout', 'AddressBookService', 'ContactService', 'SortByService', 'vCardPropertiesService', 'SearchService', function($scope, $filter, $route, $routeParams, $timeout, AddressBookService, ContactService, SortByService, vCardPropertiesService, SearchService) {
	var ctrl = this;

	ctrl.routeParams = $routeParams;

	ctrl.filteredContacts = []; // the displayed contacts list
	ctrl.searchTerm = '';
	ctrl.show = true;
	ctrl.invalid = false;
	ctrl.limitTo = 25;

	ctrl.sortBy = SortByService.getSortBy();

	ctrl.t = {
		emptySearch : t('contacts', 'No search result for {query}', {query: ctrl.searchTerm})
	};

	ctrl.resetLimitTo = function () {
		ctrl.limitTo = 25;
		clearInterval(ctrl.intervalId);
		ctrl.intervalId = setInterval(
			function () {
				if (!ctrl.loading && ctrl.contactList && ctrl.contactList.length > ctrl.limitTo) {
					ctrl.limitTo += 25;
					$scope.$apply();
				}
			}, 300);
	};

	$scope.query = function(contact) {
		return contact.matches(SearchService.getSearchTerm());
	};

	SortByService.subscribe(function(newValue) {
		ctrl.sortBy = newValue;
	});

	SearchService.registerObserverCallback(function(ev) {
		if (ev.event === 'submitSearch') {
			var uid = !_.isEmpty(ctrl.filteredContacts) ? ctrl.filteredContacts[0].uid() : undefined;
			ctrl.setSelectedId(uid);
			$scope.$apply();
		}
		if (ev.event === 'changeSearch') {
			ctrl.resetLimitTo();
			ctrl.searchTerm = ev.searchTerm;
			ctrl.t.emptySearch = t('contacts',
								   'No search result for {query}',
								   {query: ctrl.searchTerm}
								  );
			$scope.$apply();
		}
	});

	ctrl.loading = true;

	ContactService.registerObserverCallback(function(ev) {
		/* after import at first refresh the contactList */
		if (ev.event === 'importend') {
			$scope.$apply(function() {
				ctrl.contactList = ev.contacts;
			});
		}
		/* update route parameters */
		$timeout(function() {
			$scope.$apply(function() {
				switch(ev.event) {
				case 'delete':
					ctrl.selectNearestContact(ev.uid);
					break;
				case 'create':
					$route.updateParams({
						gid: $routeParams.gid,
						uid: ev.uid
					});
					break;
				case 'importend':
					/* after import select 'All contacts' group and first contact */
					$route.updateParams({
						gid: t('contacts', 'All contacts'),
						uid: ctrl.filteredContacts.length !== 0 ? ctrl.filteredContacts[0].uid() : undefined
					});
					return;
				case 'getFullContacts' || 'update':
					break;
				default:
					// unknown event -> leave callback without action
					return;
				}
				ctrl.contactList = ev.contacts;
			});
		});
	});

	AddressBookService.registerObserverCallback(function(ev) {
		$timeout(function() {
			$scope.$apply(function() {
				switch (ev.event) {
				case 'delete':
				case 'disable':
					ctrl.loading = true;
					ContactService.removeContactsFromAddressbook(ev.addressBook, function() {
						ContactService.getAll().then(function(contacts) {
							ctrl.contactList = contacts;
							ctrl.loading = false;
							// Only change contact if the selectd one is not in the list anymore
							if(ctrl.contactList.findIndex(function(contact) {
								return contact.uid() === ctrl.getSelectedId();
							}) === -1) {
								ctrl.selectNearestContact(ctrl.getSelectedId());
							}
						});
					});
					break;
				case 'enable':
					ctrl.loading = true;
					ContactService.appendContactsFromAddressbook(ev.addressBook, function() {
						ContactService.getAll().then(function(contacts) {
							ctrl.contactList = contacts;
							ctrl.loading = false;
						});
					});
					break;
				default:
						// unknown event -> leave callback without action
					return;

				}
			});
		});
	});

	// Get contacts
	ContactService.getAll().then(function(contacts) {
		if(contacts.length>0) {
			$scope.$apply(function() {
				ctrl.contactList = contacts;
			});
		} else {
			ctrl.loading = false;
		}
	});

	var getVisibleContacts = function() {
		var scrolled = $('.app-content-list').scrollTop();
		var elHeight = $('.contacts-list').children().outerHeight(true);
		var listHeight = $('.app-content-list').height();

		var topContact = Math.round(scrolled/elHeight);
		var contactsCount = Math.round(listHeight/elHeight);

		return ctrl.filteredContacts.slice(topContact-1, topContact+contactsCount+1);
	};

	var timeoutId = null;
	document.querySelector('.app-content-list').addEventListener('scroll', function () {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(function () {
			var contacts = getVisibleContacts();
			ContactService.getFullContacts(contacts);
		}, 250);
	});

	// Wait for ctrl.filteredContacts to be updated, load the contact requested in the URL if any, and
	// load full details for the probably initially visible contacts.
	// Then kill the watch.
	var unbindListWatch = $scope.$watch('ctrl.filteredContacts', function() {
		if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
			// Check if a specific uid is requested
			if($routeParams.uid && $routeParams.gid) {
				ctrl.filteredContacts.forEach(function(contact) {
					if(contact.uid() === $routeParams.uid) {
						ctrl.setSelectedId($routeParams.uid);
						ctrl.loading = false;
					}
				});
			}
			// No contact previously loaded, let's load the first of the list if not in mobile mode
			if(ctrl.loading && $(window).width() > 768) {
				ctrl.setSelectedId(ctrl.filteredContacts[0].uid());
			}
			// Get full data for the first 20 contacts of the list
			ContactService.getFullContacts(ctrl.filteredContacts.slice(0, 20));
			ctrl.loading = false;
			unbindListWatch();
		}
	});

	$scope.$watch('ctrl.routeParams.uid', function(newValue, oldValue) {
		// Used for mobile view to clear the url
		if(typeof oldValue != 'undefined' && typeof newValue == 'undefined' && $(window).width() <= 768) {
			// no contact selected
			ctrl.show = true;
			return;
		}
		if(newValue === undefined) {
			// we might have to wait until ng-repeat filled the contactList
			if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
				$route.updateParams({
					gid: $routeParams.gid,
					uid: ctrl.filteredContacts[0].uid()
				});
			} else {
				// watch for next contactList update
				var unbindWatch = $scope.$watch('ctrl.filteredContacts', function() {
					if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
						$route.updateParams({
							gid: $routeParams.gid,
							uid: ctrl.filteredContacts[0].uid()
						});
					}
					unbindWatch(); // unbind as we only want one update
				});
			}
		} else {
			// displaying contact details
			ctrl.show = false;
		}
	});

	$scope.$watch('ctrl.routeParams.gid', function() {
		// we might have to wait until ng-repeat filled the contactList
		ctrl.filteredContacts = [];
		ctrl.resetLimitTo();
		// not in mobile mode
		if($(window).width() > 768) {
			// watch for next contactList update
			var unbindWatch = $scope.$watch('ctrl.filteredContacts', function() {
				if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
					$route.updateParams({
						gid: $routeParams.gid,
						uid: $routeParams.uid || ctrl.filteredContacts[0].uid()
					});
				}
				unbindWatch(); // unbind as we only want one update
			});
		}
	});

	// Watch if we have an invalid contact
	$scope.$watch('ctrl.filteredContacts[0].displayName()', function(displayName) {
		ctrl.invalid = (displayName === '');
	});

	ctrl.hasContacts = function () {
		if (!ctrl.contactList) {
			return false;
		}
		return ctrl.contactList.length > 0;
	};

	ctrl.setSelectedId = function (contactId) {
		$route.updateParams({
			uid: contactId
		});
	};

	ctrl.getSelectedId = function() {
		return $routeParams.uid;
	};

	ctrl.selectNearestContact = function(contactId) {
		if (ctrl.filteredContacts.length === 1) {
			$route.updateParams({
				gid: $routeParams.gid,
				uid: undefined
			});
		} else {
			for (var i = 0, length = ctrl.filteredContacts.length; i < length; i++) {
				// Get nearest contact
				if (ctrl.filteredContacts[i].uid() === contactId) {
					$route.updateParams({
						gid: $routeParams.gid,
						uid: (ctrl.filteredContacts[i+1]) ? ctrl.filteredContacts[i+1].uid() : ctrl.filteredContacts[i-1].uid()
					});
					break;
				}
			}
		}
	};

}]);

angular.module('contactsApp')
.directive('contactlist', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'contactlistCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			addressbook: '=adrbook'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactList.html')
	};
});

angular.module('contactsApp')
.controller('detailsItemCtrl', ['$templateRequest', '$filter', 'vCardPropertiesService', 'ContactService', function($templateRequest, $filter, vCardPropertiesService, ContactService) {
	var ctrl = this;

	ctrl.meta = vCardPropertiesService.getMeta(ctrl.name);
	ctrl.type = undefined;
	ctrl.isPreferred = false;
	ctrl.t = {
		poBox : t('contacts', 'Post office box'),
		postalCode : t('contacts', 'Postal code'),
		city : t('contacts', 'City'),
		state : t('contacts', 'State or province'),
		country : t('contacts', 'Country'),
		address: t('contacts', 'Address'),
		newGroup: t('contacts', '(new group)'),
		familyName: t('contacts', 'Last name'),
		firstName: t('contacts', 'First name'),
		additionalNames: t('contacts', 'Additional names'),
		honorificPrefix: t('contacts', 'Prefix'),
		honorificSuffix: t('contacts', 'Suffix'),
		delete: t('contacts', 'Delete')
	};

	ctrl.availableOptions = ctrl.meta.options || [];
	if (!_.isUndefined(ctrl.data) && !_.isUndefined(ctrl.data.meta) && !_.isUndefined(ctrl.data.meta.type)) {
		// parse type of the property
		var array = ctrl.data.meta.type[0].split(',');
		array = array.map(function (elem) {
			return elem.trim().replace(/\/+$/, '').replace(/\\+$/, '').trim().toUpperCase();
		});
		// the pref value is handled on its own so that we can add some favorite icon to the ui if we want
		if (array.indexOf('PREF') >= 0) {
			ctrl.isPreferred = true;
			array.splice(array.indexOf('PREF'), 1);
		}
		// simply join the upper cased types together as key
		ctrl.type = array.join(',');
		var displayName = array.map(function (element) {
			return element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
		}).join(' ');
		// in case the type is not yet in the default list of available options we add it
		if (!ctrl.availableOptions.some(function(e) { return e.id === ctrl.type; } )) {
			ctrl.availableOptions = ctrl.availableOptions.concat([{id: ctrl.type, name: displayName}]);
		}

		// Remove duplicate entry
		ctrl.availableOptions = _.uniq(ctrl.availableOptions, function(option) { return option.name; });
		if (ctrl.availableOptions.filter(function(option) { return option.id === ctrl.type; }).length === 0) {
			// Our default value has been thrown out by the uniq function, let's find a replacement
			var optionName = ctrl.meta.options.filter(function(option) { return option.id === ctrl.type; })[0].name;
			ctrl.type = ctrl.availableOptions.filter(function(option) { return option.name === optionName; })[0].id;
			// We don't want to override the default keys. Compatibility > standardization
			// ctrl.data.meta.type[0] = ctrl.type;
			// ctrl.model.updateContact();
		}
	}
	if (!_.isUndefined(ctrl.data) && !_.isUndefined(ctrl.data.namespace)) {
		if (!_.isUndefined(ctrl.contact.props['X-ABLABEL'])) {
			var val = _.find(this.contact.props['X-ABLABEL'], function(x) { return x.namespace === ctrl.data.namespace; });
			ctrl.type = val.value.toUpperCase();
			if (!_.isUndefined(val)) {
				// in case the type is not yet in the default list of available options we add it
				if (!ctrl.availableOptions.some(function(e) { return e.id === val.value; } )) {
					ctrl.availableOptions = ctrl.availableOptions.concat([{id: val.value.toUpperCase(), name: val.value.toUpperCase()}]);
				}
			}
		}
	}

	ctrl.availableGroups = [];

	ContactService.getGroups().then(function(groups) {
		ctrl.availableGroups = _.unique(groups);
	});

	ctrl.changeType = function (val) {
		if (ctrl.isPreferred) {
			val += ',PREF';
		}
		ctrl.data.meta = ctrl.data.meta || {};
		ctrl.data.meta.type = ctrl.data.meta.type || [];
		ctrl.data.meta.type[0] = val;
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.dateInputChanged = function () {
		ctrl.data.meta = ctrl.data.meta || {};

		var match = ctrl.data.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (match) {
			ctrl.data.meta.value = [];
		} else {
			ctrl.data.meta.value = ctrl.data.meta.value || [];
			ctrl.data.meta.value[0] = 'text';
		}
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.updateDetailedName = function () {
		var fn = '';
		if (ctrl.data.value[3]) {
			fn += ctrl.data.value[3] + ' ';
		}
		if (ctrl.data.value[1]) {
			fn += ctrl.data.value[1] + ' ';
		}
		if (ctrl.data.value[2]) {
			fn += ctrl.data.value[2] + ' ';
		}
		if (ctrl.data.value[0]) {
			fn += ctrl.data.value[0] + ' ';
		}
		if (ctrl.data.value[4]) {
			fn += ctrl.data.value[4];
		}

		ctrl.contact.fullName(fn);
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.updateContact = function() {
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.getTemplate = function() {
		var templateUrl = OC.linkTo('contacts', 'templates/detailItems/' + ctrl.meta.template + '.html');
		return $templateRequest(templateUrl);
	};

	ctrl.deleteField = function () {
		ctrl.contact.removeProperty(ctrl.name, ctrl.data);
		ContactService.queueUpdate(ctrl.contact);
	};
}]);

angular.module('contactsApp')
.directive('detailsitem', ['$compile', function($compile) {
	return {
		scope: {},
		controller: 'detailsItemCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			name: '=',
			data: '=',
			contact: '=model',
			index: '='
		},
		link: function(scope, element, attrs, ctrl) {
			ctrl.getTemplate().then(function(html) {
				var template = angular.element(html);
				element.append(template);
				$compile(template)(scope);
			});
		}
	};
}]);

angular.module('contactsApp')
.controller('groupCtrl', function() {
	// eslint-disable-next-line no-unused-vars
	var ctrl = this;
});

angular.module('contactsApp')
.directive('group', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'groupCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			group: '=group'
		},
		templateUrl: OC.linkTo('contacts', 'templates/group.html')
	};
});

angular.module('contactsApp')
.controller('grouplistCtrl', ['$scope', '$timeout', 'ContactService', 'SearchService', '$routeParams', function($scope, $timeout, ContactService, SearchService, $routeParams) {
	var ctrl = this;

	ctrl.groups = [];
	ctrl.contactFilters = [];

	ContactService.getGroupList().then(function(groups) {
		ctrl.groups = groups;
	});

	ContactService.getContactFilters().then(function(contactFilters) {
		ctrl.contactFilters = contactFilters;
	});

	ctrl.getSelected = function() {
		return $routeParams.gid;
	};

	// Update groupList on contact add/delete/update/groupsUpdate
	ContactService.registerObserverCallback(function(ev) {
		if (ev.event !== 'getFullContacts') {
			$timeout(function () {
				$scope.$apply(function() {
					ContactService.getGroupList().then(function(groups) {
						ctrl.groups = groups;
					});
					ContactService.getContactFilters().then(function(contactFilters) {
						ctrl.contactFilters = contactFilters;
					});
				});
			});
		}
	});

	ctrl.setSelected = function (selectedGroup) {
		SearchService.cleanSearch();
		$routeParams.gid = selectedGroup;
	};
}]);

angular.module('contactsApp')
.directive('grouplist', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'grouplistCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/groupList.html')
	};
});

angular.module('contactsApp')
.controller('importscreenCtrl', ['$scope', 'ImportService', function($scope, ImportService) {
	var ctrl = this;

	ctrl.t = {
		importingTo : t('contacts', 'Importing into'),
		selectAddressbook : t('contacts', 'Select your addressbook')
	};

	// Broadcast update
	$scope.$on('importing', function () {
		ctrl.selectedAddressBook = ImportService.selectedAddressBook;
		ctrl.importedUser = ImportService.importedUser;
		ctrl.importing = ImportService.importing;
		ctrl.importPercent = ImportService.importPercent;
	});

}]);

angular.module('contactsApp')
.directive('importscreen', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'importscreenCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/importScreen.html')
	};
});

angular.module('contactsApp')
.controller('newContactButtonCtrl', ['$scope', 'ContactService', '$routeParams', 'vCardPropertiesService', function($scope, ContactService, $routeParams, vCardPropertiesService) {
	var ctrl = this;

	ctrl.t = {
		addContact : t('contacts', 'New contact')
	};

	ctrl.createContact = function() {
		ContactService.create().then(function(contact) {
			['tel', 'adr', 'email'].forEach(function(field) {
				var defaultValue = vCardPropertiesService.getMeta(field).defaultValue || {value: ''};
				contact.addProperty(field, defaultValue);
			} );
			if ([t('contacts', 'All contacts'), t('contacts', 'Not grouped')].indexOf($routeParams.gid) === -1) {
				contact.categories([ $routeParams.gid ]);
			} else {
				contact.categories([]);
			}
			$('#details-fullName').focus();
		});
	};
}]);

angular.module('contactsApp')
.directive('newcontactbutton', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'newContactButtonCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/newContactButton.html')
	};
});

angular.module('contactsApp')
.directive('telModel', function() {
	return{
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attr, ngModel) {
			ngModel.$formatters.push(function(value) {
				return value;
			});
			ngModel.$parsers.push(function(value) {
				return value;
			});
		}
	};
});

angular.module('contactsApp')
.controller('propertyGroupCtrl', ['vCardPropertiesService', function(vCardPropertiesService) {
	var ctrl = this;

	ctrl.meta = vCardPropertiesService.getMeta(ctrl.name);

	this.isHidden = function() {
		return ctrl.meta.hasOwnProperty('hidden') && ctrl.meta.hidden === true;
	};

	this.getIconClass = function() {
		return ctrl.meta.icon || 'icon-contacts-dark';
	};

	this.getInfoClass = function() {
		if (ctrl.meta.hasOwnProperty('info')) {
			return 'icon-info';

		}
	};

	this.getInfoText = function() {
		return ctrl.meta.info;
	};

	this.getReadableName = function() {
		return ctrl.meta.readableName;
	};
}]);

angular.module('contactsApp')
.directive('propertygroup', function() {
	return {
		scope: {},
		controller: 'propertyGroupCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			properties: '=data',
			name: '=',
			contact: '=model'
		},
		templateUrl: OC.linkTo('contacts', 'templates/propertyGroup.html'),
		link: function(scope, element, attrs, ctrl) {
			if(ctrl.isHidden()) {
				// TODO replace with class
				element.css('display', 'none');
			}
		}
	};
});

angular.module('contactsApp')
.controller('sortbyCtrl', ['SortByService', function(SortByService) {
	var ctrl = this;

	var sortText = t('contacts', 'Sort by');
	ctrl.sortText = sortText;

	var sortList = SortByService.getSortByList();
	ctrl.sortList = sortList;

	ctrl.defaultOrder = SortByService.getSortByKey();

	ctrl.updateSortBy = function() {
		SortByService.setSortBy(ctrl.defaultOrder);
	};
}]);

angular.module('contactsApp')
.directive('sortby', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'sortbyCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/sortBy.html')
	};
});

angular.module('contactsApp')
.factory('AddressBook', function()
{
	return function AddressBook(data) {
		angular.extend(this, {

			displayName: '',
			contacts: [],
			groups: data.data.props.groups,
			readOnly: data.data.props.readOnly === '1',
			// In case of not defined
			enabled: data.data.props.enabled !== '0',

			sharedWith: {
				users: [],
				groups: []
			}

		});
		angular.extend(this, data);
		angular.extend(this, {
			owner: data.data.props.owner.split('/').slice(-2, -1)[0]
		});

		var shares = this.data.props.invite;
		if (typeof shares !== 'undefined') {
			for (var j = 0; j < shares.length; j++) {
				var href = shares[j].href;
				if (href.length === 0) {
					continue;
				}
				var access = shares[j].access;
				if (access.length === 0) {
					continue;
				}

				var readWrite = (typeof access.readWrite !== 'undefined');

				if (href.startsWith('principal:principals/users/')) {
					this.sharedWith.users.push({
						id: href.substr(27),
						displayname: href.substr(27),
						writable: readWrite
					});
				} else if (href.startsWith('principal:principals/groups/')) {
					this.sharedWith.groups.push({
						id: href.substr(28),
						displayname: href.substr(28),
						writable: readWrite
					});
				}
			}
		}
	};
});

angular.module('contactsApp')
	.factory('ContactFilter', function()
	{
		return function ContactFilter(data) {
			angular.extend(this, {
				name: '',
				count: 0
			});

			angular.extend(this, data);
		};
	});

angular.module('contactsApp')
.factory('Contact', ['$filter', 'MimeService', 'uuid4', function($filter, MimeService, uuid4) {
	return function Contact(addressBook, vCard) {
		angular.extend(this, {

			data: {},
			props: {},
			failedProps: [],

			dateProperties: ['bday', 'anniversary', 'deathdate'],

			addressBookId: addressBook.displayName,
			readOnly: addressBook.readOnly,

			version: function() {
				var property = this.getProperty('version');
				if(property) {
					return property.value;
				}

				return undefined;
			},

			uid: function(value) {
				var model = this;
				if (angular.isDefined(value)) {
					// setter
					return model.setProperty('uid', { value: value });
				} else {
					// getter
					var uid = model.getProperty('uid').value;
					/* global md5 */
					return uuid4.validate(uid) ? uid : md5(uid);
				}
			},

			displayName: function() {
				var displayName = this.fullName() || this.org() || '';
				if(angular.isArray(displayName)) {
					return displayName.join(' ');
				}
				return displayName;
			},

			readableFilename: function() {
				if(this.displayName()) {
					return (this.displayName()) + '.vcf';
				} else {
					// fallback to default filename (see download attribute)
					return '';
				}

			},

			firstName: function() {
				var property = this.getProperty('n');
				if (property) {
					return property.value[1];
				} else {
					return this.displayName();
				}
			},

			lastName: function() {
				var property = this.getProperty('n');
				if (property) {
					return property.value[0];
				} else {
					return this.displayName();
				}
			},

			additionalNames: function() {
				var property = this.getProperty('n');
				if (property) {
					return property.value[2];
				} else {
					return '';
				}
			},

			fullName: function(value) {
				var model = this;
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('fn', { value: value });
				} else {
					// getter
					var property = model.getProperty('fn');
					if(property) {
						return property.value;
					}
					property = model.getProperty('n');
					if(property) {
						return property.value.filter(function(elem) {
							return elem;
						}).join(' ');
					}
					return undefined;
				}
			},

			title: function(value) {
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('title', { value: value });
				} else {
					// getter
					var property = this.getProperty('title');
					if(property) {
						return property.value;
					} else {
						return undefined;
					}
				}
			},

			org: function(value) {
				var property = this.getProperty('org');
				if (angular.isDefined(value)) {
					var val = value;
					// setter
					if(property && Array.isArray(property.value)) {
						val = property.value;
						val[0] = value;
					}
					return this.setProperty('org', { value: val });
				} else {
					// getter
					if(property) {
						if (Array.isArray(property.value)) {
							return property.value[0];
						}
						return property.value;
					} else {
						return undefined;
					}
				}
			},

			email: function() {
				// getter
				var property = this.getProperty('email');
				if(property) {
					return property.value;
				} else {
					return undefined;
				}
			},

			photo: function(value) {
				if (angular.isDefined(value)) {
					// setter
					// splits image data into "data:image/jpeg" and base 64 encoded image
					var imageData = value.split(';base64,');
					var imageType = imageData[0].slice('data:'.length);
					if (!imageType.startsWith('image/')) {
						return;
					}
					imageType = imageType.substring(6).toUpperCase();

					return this.setProperty('photo', { value: imageData[1], meta: {type: [imageType], encoding: ['b']} });
				} else {
					var property = this.getProperty('photo');
					if(property) {
						var type = property.meta.type;
						if (angular.isArray(type)) {
							type = type[0];
						}
						if (!type.startsWith('image/')) {
							type = 'image/' + type.toLowerCase();
						}
						return 'data:' + type + ';base64,' + property.value;
					} else {
						return undefined;
					}
				}
			},

			categories: function(value) {
				if (angular.isDefined(value)) {
					// setter
					if (angular.isString(value)) {
						/* check for empty string */
						this.setProperty('categories', { value: !value.length ? [] : [value] });
					} else if (angular.isArray(value)) {
						this.setProperty('categories', { value: value });
					}
				} else {
					// getter
					var property = this.getProperty('categories');
					if(!property) {
						return [];
					}
					if (angular.isArray(property.value)) {
						return property.value;
					}
					return [property.value];
				}
			},

			formatDateAsRFC6350: function(name, data) {
				if (angular.isUndefined(data) || angular.isUndefined(data.value)) {
					return data;
				}
				if (this.dateProperties.indexOf(name) !== -1) {
					var match = data.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
					if (match) {
						data.value = match[1] + match[2] + match[3];
					}
				}

				return data;
			},

			formatDateForDisplay: function(name, data) {
				if (angular.isUndefined(data) || angular.isUndefined(data.value)) {
					return data;
				}
				if (this.dateProperties.indexOf(name) !== -1) {
					var match = data.value.match(/^(\d{4})(\d{2})(\d{2})$/);
					if (match) {
						data.value = match[1] + '-' + match[2] + '-' + match[3];
					}
				}

				return data;
			},

			getProperty: function(name) {
				if (this.props[name]) {
					return this.formatDateForDisplay(name, this.validate(name, this.props[name][0]));
				} else {
					return undefined;
				}
			},
			addProperty: function(name, data) {
				data = angular.copy(data);
				data = this.formatDateAsRFC6350(name, data);
				if(!this.props[name]) {
					this.props[name] = [];
				}
				var idx = this.props[name].length;
				this.props[name][idx] = data;

				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
				return idx;
			},
			setProperty: function(name, data) {
				if(!this.props[name]) {
					this.props[name] = [];
				}
				data = this.formatDateAsRFC6350(name, data);
				this.props[name][0] = data;

				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},
			removeProperty: function (name, prop) {
				angular.copy(_.without(this.props[name], prop), this.props[name]);
				if(this.props[name].length === 0) {
					delete this.props[name];
				}
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},
			setETag: function(etag) {
				this.data.etag = etag;
			},
			setUrl: function(addressBook, uid) {
				this.data.url = addressBook.url + uid + '.vcf';
			},
			setAddressBook: function(addressBook) {
				this.addressBookId = addressBook.displayName;
				this.data.url = addressBook.url + this.uid() + '.vcf';
			},

			getISODate: function(date) {
				function pad(number) {
					if (number < 10) {
						return '0' + number;
					}
					return '' + number;
				}

				return date.getUTCFullYear() + '' +
						pad(date.getUTCMonth() + 1) +
						pad(date.getUTCDate()) +
						'T' + pad(date.getUTCHours()) +
						pad(date.getUTCMinutes()) +
						pad(date.getUTCSeconds()) + 'Z';
			},

			syncVCard: function() {

				this.setProperty('rev', { value: this.getISODate(new Date()) });
				var self = this;

				_.each(this.dateProperties, function(name) {
					if (!angular.isUndefined(self.props[name]) && !angular.isUndefined(self.props[name][0])) {
						// Set dates again to make sure they are in RFC-6350 format
						self.setProperty(name, self.props[name][0]);
					}
				});
				// force fn to be set
				this.fullName(this.fullName());

				// keep vCard in sync
				self.data.addressData = $filter('JSON2vCard')(self.props);

				// Revalidate all props
				_.each(self.failedProps, function(name, index) {
					if (!angular.isUndefined(self.props[name]) && !angular.isUndefined(self.props[name][0])) {
						// Reset previously failed properties
						self.failedProps.splice(index, 1);
						// And revalidate them again
						self.validate(name, self.props[name][0]);

					} else if(angular.isUndefined(self.props[name]) || angular.isUndefined(self.props[name][0])) {
						// Property has been removed
						self.failedProps.splice(index, 1);
					}
				});

			},

			matches: function(pattern) {
				if (angular.isUndefined(pattern) || pattern.length === 0) {
					return true;
				}
				var model = this;
				var matchingProps = ['fn', 'title', 'org', 'email', 'nickname', 'note', 'url', 'cloud', 'adr', 'impp', 'tel', 'gender', 'relationship', 'related'].filter(function (propName) {
					if (model.props[propName]) {
						return model.props[propName].filter(function (property) {
							if (!property.value) {
								return false;
							}
							if (angular.isString(property.value)) {
								return property.value.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
							}
							if (angular.isArray(property.value)) {
								return property.value.filter(function(v) {
									return v.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
								}).length > 0;
							}
							return false;
						}).length > 0;
					}
					return false;
				});
				return matchingProps.length > 0;
			},

			/* eslint-disable no-console */
			validate: function(prop, property) {
				switch(prop) {
				case 'rev':
				case 'prodid':
				case 'version':
					if (!angular.isUndefined(this.props[prop]) && this.props[prop].length > 1) {
						this.props[prop] = [this.props[prop][0]];
						console.warn(this.uid()+': Too many '+prop+' fields. Saving this one only: ' + this.props[prop][0].value);
						this.failedProps.push(prop);
					}
					break;

				case 'categories':
					// Avoid unescaped commas
					if (angular.isArray(property.value)) {
						if(property.value.join(';').indexOf(',') !== -1) {
							this.failedProps.push(prop);
							property.value = property.value.join(',').split(',');
							//console.warn(this.uid()+': Categories split: ' + property.value);
						}
					} else if (angular.isString(property.value)) {
						if(property.value.indexOf(',') !== -1) {
							this.failedProps.push(prop);
							property.value = property.value.split(',');
							//console.warn(this.uid()+': Categories split: ' + property.value);
						}
					}
					// Remove duplicate categories on array
					if(property.value.length !== 0 && angular.isArray(property.value)) {
						var uniqueCategories = _.unique(property.value);
						if(!angular.equals(uniqueCategories, property.value)) {
							this.failedProps.push(prop);
							property.value = uniqueCategories;
							//console.warn(this.uid()+': Categories duplicate: ' + property.value);
						}
					}
					break;
				case 'photo':
					// Avoid undefined photo type
					if (angular.isDefined(property)) {
						if (angular.isUndefined(property.meta.type)) {
							var mime = MimeService.b64mime(property.value);
							if (mime) {
								this.failedProps.push(prop);
								property.meta.type=[mime];
								this.setProperty('photo', {
									value:property.value,
									meta: {
										type:property.meta.type,
										encoding:property.meta.encoding
									}
								});
								console.warn(this.uid()+': Photo detected as ' + property.meta.type);
							} else {
								this.failedProps.push(prop);
								this.removeProperty('photo', property);
								property = undefined;
								console.warn(this.uid()+': Photo removed');
							}
						}
					}
					break;
				}
				return property;
			},
			/* eslint-enable no-console */

			fix: function() {
				this.validate('rev');
				this.validate('version');
				this.validate('prodid');
				return this.failedProps.indexOf('rev') !== -1
					|| this.failedProps.indexOf('prodid') !== -1
					|| this.failedProps.indexOf('version') !== -1;
			}

		});

		if(angular.isDefined(vCard)) {
			angular.extend(this.data, vCard);
			angular.extend(this.props, $filter('vCard2JSON')(this.data.addressData));
			// We do not want to store our addressbook within contacts
			delete this.data.addressBook;
		} else {
			angular.extend(this.props, {
				version: [{value: '3.0'}],
				fn: [{value: t('contacts', 'New contact')}]
			});
			this.data.addressData = $filter('JSON2vCard')(this.props);
		}

		var property = this.getProperty('categories');
		if(!property) {
			// categories should always have the same type (an array)
			this.categories([]);
		} else {
			if (angular.isString(property.value)) {
				this.categories([property.value]);
			}
		}
	};
}]);

angular.module('contactsApp')
	.factory('Group', function()
	{
		return function Group(data) {
			angular.extend(this, {
				name: '',
				count: 0
			});

			angular.extend(this, data);
		};
	});

angular.module('contactsApp')
.factory('AddressBookService', ['DavClient', 'DavService', 'SettingsService', 'AddressBook', '$q', function(DavClient, DavService, SettingsService, AddressBook, $q) {

	var addressBooks = [];
	var loadPromise = undefined;

	var observerCallbacks = [];

	var notifyObservers = function(eventName, addressBook) {
		var ev = {
			event: eventName,
			addressBooks: addressBooks,
			addressBook: addressBook,
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	var loadAll = function() {
		if (addressBooks.length > 0) {
			return $q.when(addressBooks);
		}
		if (_.isUndefined(loadPromise)) {
			loadPromise = DavService.then(function(account) {
				loadPromise = undefined;
				addressBooks = account.addressBooks.map(function(addressBook) {
					return new AddressBook(addressBook);
				});
			});
		}
		return loadPromise;
	};

	return {
		registerObserverCallback: function(callback) {
			observerCallbacks.push(callback);
		},

		getAll: function() {
			return loadAll().then(function() {
				return addressBooks;
			});
		},

		getGroups: function() {
			return this.getAll().then(function(addressBooks) {
				return addressBooks.map(function (element) {
					return element.groups;
				}).reduce(function(a, b) {
					return a.concat(b);
				});
			});
		},

		getDefaultAddressBook: function(throwOC) {
			var i = addressBooks.findIndex(function(addressBook) {
				return addressBook.enabled && !addressBook.readOnly;
			});
			if (i !== -1) {
				return addressBooks[i];
			} else if(throwOC) {
				OC.Notification.showTemporary(t('contacts', 'There is no address book available to create a contact.'));
			}
			return false;
		},

		getAddressBook: function(displayName) {
			return DavService.then(function(account) {
				return DavClient.getAddressBook({displayName:displayName, url:account.homeUrl}).then(function(res) {
					var addressBook = new AddressBook({
						account: account,
						ctag: res[0].props.getctag,
						url: account.homeUrl+displayName+'/',
						data: res[0],
						displayName: res[0].props.displayname,
						resourcetype: res[0].props.resourcetype,
						syncToken: res[0].props.syncToken
					});
					notifyObservers('create', addressBook);
					return addressBook;
				});
			});
		},

		create: function(displayName) {
			return DavService.then(function(account) {
				return DavClient.createAddressBook({displayName:displayName, url:account.homeUrl});
			});
		},

		delete: function(addressBook) {
			return DavService.then(function() {
				return DavClient.deleteAddressBook(addressBook).then(function() {
					var index = addressBooks.indexOf(addressBook);
					addressBooks.splice(index, 1);
					notifyObservers('delete', addressBook);
				});
			});
		},

		rename: function(addressBook, displayName) {
			return DavService.then(function(account) {
				return DavClient.renameAddressBook(addressBook, {displayName:displayName, url:account.homeUrl});
			});
		},

		get: function(displayName) {
			return this.getAll().then(function(addressBooks) {
				return addressBooks.filter(function (element) {
					return element.displayName === displayName;
				})[0];
			});
		},

		sync: function(addressBook) {
			return DavClient.syncAddressBook(addressBook);
		},

		addContact: function(addressBook, contact) {
			// We don't want to add the same contact again
			if (addressBook.contacts.indexOf(contact) === -1) {
				return addressBook.contacts.push(contact);
			}
		},

		removeContact: function(addressBook, contact) {
			// We can't remove an undefined object
			if (addressBook.contacts.indexOf(contact) !== -1) {
				return addressBook.contacts.splice(addressBook.contacts.indexOf(contact), 1);
			}
		},

		toggleState: function(addressBook) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var dPropUpdate = xmlDoc.createElement('d:propertyupdate');
			dPropUpdate.setAttribute('xmlns:d', 'DAV:');
			dPropUpdate.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(dPropUpdate);

			var dSet = xmlDoc.createElement('d:set');
			dPropUpdate.appendChild(dSet);

			var dProp = xmlDoc.createElement('d:prop');
			dSet.appendChild(dProp);

			var oEnabled = xmlDoc.createElement('o:enabled');
			// Revert state to toggle
			oEnabled.textContent = !addressBook.enabled ? '1' : '0';
			dProp.appendChild(oEnabled);

			var body = dPropUpdate.outerHTML;

			return DavClient.xhr.send(
				dav.request.basic({method: 'PROPPATCH', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 207) {
					addressBook.enabled = !addressBook.enabled;
					notifyObservers(
						addressBook.enabled ? 'enable' : 'disable',
						addressBook
					);
				}
				return addressBook;
			});
		},

		share: function(addressBook, shareType, shareWith, writable, existingShare) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var oShare = xmlDoc.createElement('o:share');
			oShare.setAttribute('xmlns:d', 'DAV:');
			oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(oShare);

			var oSet = xmlDoc.createElement('o:set');
			oShare.appendChild(oSet);

			var dHref = xmlDoc.createElement('d:href');
			if (shareType === OC.Share.SHARE_TYPE_USER) {
				dHref.textContent = 'principal:principals/users/';
			} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				dHref.textContent = 'principal:principals/groups/';
			}
			dHref.textContent += shareWith;
			oSet.appendChild(dHref);

			var oSummary = xmlDoc.createElement('o:summary');
			oSummary.textContent = t('contacts', '{addressbook} shared by {owner}', {
				addressbook: addressBook.displayName,
				owner: addressBook.owner
			});
			oSet.appendChild(oSummary);

			if (writable) {
				var oRW = xmlDoc.createElement('o:read-write');
				oSet.appendChild(oRW);
			}

			var body = oShare.outerHTML;

			return DavClient.xhr.send(
				dav.request.basic({method: 'POST', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 200) {
					if (!existingShare) {
						if (shareType === OC.Share.SHARE_TYPE_USER) {
							addressBook.sharedWith.users.push({
								id: shareWith,
								displayname: shareWith,
								writable: writable
							});
						} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
							addressBook.sharedWith.groups.push({
								id: shareWith,
								displayname: shareWith,
								writable: writable
							});
						}
					}
				}
			});

		},

		unshare: function(addressBook, shareType, shareWith) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var oShare = xmlDoc.createElement('o:share');
			oShare.setAttribute('xmlns:d', 'DAV:');
			oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(oShare);

			var oRemove = xmlDoc.createElement('o:remove');
			oShare.appendChild(oRemove);

			var dHref = xmlDoc.createElement('d:href');
			if (shareType === OC.Share.SHARE_TYPE_USER) {
				dHref.textContent = 'principal:principals/users/';
			} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				dHref.textContent = 'principal:principals/groups/';
			}
			dHref.textContent += shareWith;
			oRemove.appendChild(dHref);
			var body = oShare.outerHTML;


			return DavClient.xhr.send(
				dav.request.basic({method: 'POST', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 200) {
					if (shareType === OC.Share.SHARE_TYPE_USER) {
						addressBook.sharedWith.users = addressBook.sharedWith.users.filter(function(user) {
							return user.id !== shareWith;
						});
					} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
						addressBook.sharedWith.groups = addressBook.sharedWith.groups.filter(function(groups) {
							return groups.id !== shareWith;
						});
					}
					//todo - remove entry from addressbook object
					return true;
				} else {
					return false;
				}
			});

		}


	};

}]);

angular.module('contactsApp')
.service('ContactService', ['DavClient', 'AddressBookService', 'Contact', 'Group', 'ContactFilter', '$q', 'CacheFactory', 'uuid4', function(DavClient, AddressBookService, Contact, Group, ContactFilter, $q, CacheFactory, uuid4) {

	var contactService = this;

	var cacheFilled = false;
	var contactsCache = CacheFactory('contacts');
	var observerCallbacks = [];
	var loadPromise = undefined;

	var allUpdates = $q.when();
	this.queueUpdate = function(contact) {
		allUpdates = allUpdates.then(function() {
			return contactService.update(contact);
		});
	};

	this.registerObserverCallback = function(callback) {
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(eventName, uid) {
		var ev = {
			event: eventName,
			uid: uid,
			contacts: contactsCache.values()
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	this.getFullContacts = function(contacts) {
		AddressBookService.getAll().then(function(addressBooks) {
			var promises = [];
			var xhrAddressBooks = [];
			contacts.forEach(function(contact) {
				// Regroup urls by addressbooks
				if(addressBooks.indexOf(contact.addressBook) !== -1) {
					// Initiate array if no exists
					xhrAddressBooks[contact.addressBookId] = xhrAddressBooks[contact.addressBookId] || [];
					xhrAddressBooks[contact.addressBookId].push(contact.data.url);
				}
			});
			// Get our full vCards
			addressBooks.forEach(function(addressBook) {
				// Only go through enabled addressbooks
				// Though xhrAddressBooks does not contains contacts from disabled ones
				if(addressBook.enabled) {
					if(angular.isArray(xhrAddressBooks[addressBook.displayName])) {
						var promise = DavClient.getContacts(addressBook, {}, xhrAddressBooks[addressBook.displayName]).then(
							function(vcards) {
								return vcards.map(function(vcard) {
									return new Contact(addressBook, vcard);
								});
							}).then(function(contacts_) {
								contacts_.map(function(contact) {
									// Validate some fields
									if(contact.fix()) {
										// Can't use `this` in those nested functions
										contactService.update(contact);
									}
									contactsCache.put(contact.uid(), contact);
									addressBook.contacts.push(contact);
								});
							});
						promises.push(promise);
					}
				}
			});
			$q.all(promises).then(function() {
				notifyObservers('getFullContacts', '');
			});
		});
	};

	this.fillCache = function() {
		if (_.isUndefined(loadPromise)) {
			loadPromise = AddressBookService.getAll().then(function(addressBooks) {
				var promises = [];
				addressBooks.forEach(function(addressBook) {
					// Only go through enabled addressbooks
					if(addressBook.enabled) {
						promises.push(
							AddressBookService.sync(addressBook).then(function(addressBook) {
								contactService.appendContactsFromAddressbook(addressBook);
							})
						);
					}
				});
				return $q.all(promises).then(function() {
					cacheFilled = true;
				});
			});
		}
		return loadPromise;
	};

	this.getAll = function() {
		if(cacheFilled === false) {
			return this.fillCache().then(function() {
				return contactsCache.values();
			});
		} else {
			return $q.when(contactsCache.values());
		}
	};

	this.getContactFilters = function() {
		return this.getAll().then(function(contacts) {
			var allContacts = new ContactFilter({
				name: t('contacts', 'All contacts'),
				count: contacts.length
			});
			var notGrouped = new ContactFilter({
				name: t('contacts', 'Not grouped'),
				count: contacts.filter(
					function(contact) {
						return contact.categories().length === 0;
					}).length
			});
			var filters = [allContacts];
			// Only have Not Grouped if at least one contact in it
			if(notGrouped.count !== 0) {
				filters.push(notGrouped);
			}

			return filters;
		});
	};

	// get list of groups and the count of contacts in said groups
	this.getGroupList = function() {
		return this.getAll().then(function(contacts) {
			// allow groups with names such as toString
			var groups = Object.create(null);

			// collect categories and their associated counts
			contacts.forEach(function(contact) {
				contact.categories().forEach(function(category) {
					groups[category] = groups[category] ? groups[category] + 1 : 1;
				});
			});
			return _.keys(groups).map(
				function(key) {
					return new Group({
						name: key,
						count: groups[key]
					});
				});
		});
	};

	this.getGroups = function() {
		return this.getAll().then(function(contacts) {
			return _.uniq(contacts.map(function(element) {
				return element.categories();
			}).reduce(function(a, b) {
				return a.concat(b);
			}, []).sort(), true);
		});
	};

	this.getById = function(addressBooks, uid) {
		return (function() {
			if(cacheFilled === false) {
				return this.fillCache().then(function() {
					return contactsCache.get(uid);
				});
			} else {
				return $q.when(contactsCache.get(uid));
			}
		}).call(this)
			.then(function(contact) {
				if(angular.isUndefined(contact)) {
					OC.Notification.showTemporary(t('contacts', 'Contact not found.'));
					return;
				} else {
					var addressBook = addressBooks.find(function(book) {
						return book.displayName === contact.addressBookId;
					});
					// Fetch and return full contact vcard
					return addressBook
						? DavClient.getContacts(addressBook, {}, [ contact.data.url ]).then(function(vcards) {
							return new Contact(addressBook, vcards[0]);
						}).then(function(newContact) {
							contactsCache.put(contact.uid(), newContact);
							var contactIndex = addressBook.contacts.findIndex(function(testedContact) {
								return testedContact.uid() === contact.uid();
							});
							addressBook.contacts[contactIndex] = newContact;
							notifyObservers('getFullContacts', contact.uid());
							return newContact;
						}) : contact;
				}
			});
	};

	this.create = function(newContact, addressBook, uid, fromImport) {
		addressBook = addressBook || AddressBookService.getDefaultAddressBook(true);

		// No addressBook available
		if(!addressBook) {
			return;
		}

		if(addressBook.readOnly) {
			OC.Notification.showTemporary(t('contacts', 'You don\'t have permission to write to this addressbook.'));
			return;
		}
		try {
			newContact = newContact || new Contact(addressBook);
		} catch(error) {
			OC.Notification.showTemporary(t('contacts', 'Contact could not be created.'));
			return;
		}
		var newUid = '';
		if(uuid4.validate(uid)) {
			newUid = uid;
		} else {
			newUid = uuid4.generate();
		}
		newContact.uid(newUid);
		newContact.setUrl(addressBook, newUid);
		newContact.addressBookId = addressBook.displayName;
		if (_.isUndefined(newContact.fullName()) || newContact.fullName() === '') {
			newContact.fullName(newContact.displayName());
		}

		return DavClient.createCard(
			addressBook,
			{
				data: newContact.data.addressData,
				filename: newUid + '.vcf'
			}
		).then(function(xhr) {
			newContact.setETag(xhr.getResponseHeader('OC-ETag') || xhr.getResponseHeader('ETag'));
			contactsCache.put(newUid, newContact);
			AddressBookService.addContact(addressBook, newContact);
			if (fromImport !== true) {
				notifyObservers('create', newUid);
				$('#details-fullName').select();
			}
			return newContact;
		}).catch(function() {
			OC.Notification.showTemporary(t('contacts', 'Contact could not be created.'));
			return false;
		});
	};

	this.import = function(data, type, addressBook, progressCallback) {
		addressBook = addressBook || AddressBookService.getDefaultAddressBook(true);

		// No addressBook available
		if(!addressBook) {
			return;
		}

		var regexp = /BEGIN:VCARD[\s\S]*?END:VCARD/mgi;
		var singleVCards = data.match(regexp);

		if (!singleVCards) {
			OC.Notification.showTemporary(t('contacts', 'No contacts in file. Only vCard files are allowed.'));
			if (progressCallback) {
				progressCallback(1);
			}
			return;
		}

		notifyObservers('importstart');

		var num = 1;
		for(var i in singleVCards) {
			var newContact = new Contact(addressBook, {addressData: singleVCards[i]});
			if (['3.0', '4.0'].indexOf(newContact.version()) < 0) {
				if (progressCallback) {
					progressCallback(num / singleVCards.length);
				}
				OC.Notification.showTemporary(t('contacts', 'Only vCard version 4.0 (RFC6350) or version 3.0 (RFC2426) are supported.'));
				num++;
				continue;
			}
			// eslint-disable-next-line no-loop-func
			this.create(newContact, addressBook, '', true).then(function(xhrContact) {
				if (xhrContact !== false) {
					var xhrContactName = xhrContact.displayName();
				}
				// Update the progress indicator
				if (progressCallback) {
					progressCallback(num / singleVCards.length, xhrContactName);
				}
				num++;
				/* Import is over, let's notify */
				if (num === singleVCards.length + 1) {
					notifyObservers('importend');
				}
			});
		}
	};

	this.moveContact = function(contact, addressBook, oldAddressBook) {
		if (addressBook !== null && contact.addressBookId === addressBook.displayName) {
			return;
		}
		if (addressBook.readOnly) {
			OC.Notification.showTemporary(t('contacts', 'You don\'t have permission to write to this addressbook.'));
			return;
		}
		contact.syncVCard();

		DavClient.xhr.send(
			dav.request.basic({method: 'MOVE', destination: addressBook.url + contact.data.url.split('/').pop(-1)}),
			contact.data.url
		).then(function(response) {
			if (response.status === 201 || response.status === 204) {
				contact.setAddressBook(addressBook);
				AddressBookService.addContact(addressBook, contact);
				AddressBookService.removeContact(oldAddressBook, contact);
				notifyObservers('groupsUpdate');
			} else {
				OC.Notification.showTemporary(t('contacts', 'Contact could not be moved.'));
			}
		});
	};

	this.update = function(contact) {
		// update rev field
		contact.syncVCard();

		// update contact on server
		return DavClient.updateCard(contact.data, {json: true}).then(function(xhr) {
			var newEtag = xhr.getResponseHeader('OC-ETag') || xhr.getResponseHeader('ETag');
			contact.setETag(newEtag);
			notifyObservers('update', contact.uid());
		}).catch(function() {
			OC.Notification.showTemporary(t('contacts', 'Contact could not be saved.'));
		});
	};

	this.delete = function(addressBook, contact) {
		// delete contact from server
		return DavClient.deleteCard(contact.data).then(function() {
			contactsCache.remove(contact.uid());
			AddressBookService.removeContact(addressBook, contact);
			notifyObservers('delete', contact.uid());
		});
	};

	/*
	 * Delete all contacts present in the addressBook from the cache
	 */
	this.removeContactsFromAddressbook = function(addressBook, callback) {
		angular.forEach(addressBook.contacts, function(contact) {
			contactsCache.remove(contact.uid());
		});
		callback();
		notifyObservers('groupsUpdate');
	};

	/*
	 * Create and append contacts to the addressBook
	 */
	this.appendContactsFromAddressbook = function(addressBook, callback) {
		// Addressbook has been initiated but contacts have not been fetched
		if (addressBook.objects === null) {
			AddressBookService.sync(addressBook).then(function(addressBook) {
				contactService.appendContactsFromAddressbook(addressBook, callback);
			});
		} else if (addressBook.contacts.length === 0) {
			// Only add contact if the addressBook doesn't already have it
			addressBook.objects.forEach(function(vcard) {
				try {
					// Only add contact if the addressBook doesn't already have it
					var contact = new Contact(addressBook, vcard);
					contactsCache.put(contact.uid(), contact);
					AddressBookService.addContact(addressBook, contact);
				} catch(error) {
					// eslint-disable-next-line no-console
					console.log('Invalid contact received: ', vcard, error);
				}
			});
		} else {
			// Contact are already present in the addressBook
			angular.forEach(addressBook.contacts, function(contact) {
				contactsCache.put(contact.uid(), contact);
			});
		}
		notifyObservers('groupsUpdate');
		if (typeof callback === 'function') {
			callback();
		}
	};

}]);

angular.module('contactsApp')
.service('DavClient', function() {
	var xhr = new dav.transport.Basic(
		new dav.Credentials()
	);
	return new dav.Client(xhr);
});

angular.module('contactsApp')
.service('DavService', ['DavClient', function(DavClient) {
	return DavClient.createAccount({
		server: OC.linkToRemote('dav/addressbooks'),
		accountType: 'carddav',
		useProvidedPath: true
	});
}]);

angular.module('contactsApp')
.service('ImportService', function() {

	this.importing = false;
	this.selectedAddressBook = t('contacts', 'Import into');
	this.importedUser = t('contacts', 'Waiting for the server to be ready…');
	this.importPercent = 0;

	this.t = {
		importText : t('contacts', 'Import into'),
		importingText : t('contacts', 'Importing…')
	};

});

angular.module('contactsApp')
	.service('MimeService', function() {
		var magicNumbers = {
			'/9j/' : 'JPEG',
			'R0lGOD' : 'GIF',
			'iVBORw0KGgo' : 'PNG'
		};

		this.b64mime = function(b64string) {
			for (var mn in magicNumbers) {
				if(b64string.startsWith(mn)) return magicNumbers[mn];
			}
			return null;
		};
	});

angular.module('contactsApp')
.service('SearchService', function() {
	var searchTerm = '';

	var observerCallbacks = [];

	this.registerObserverCallback = function(callback) {
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(eventName) {
		var ev = {
			event:eventName,
			searchTerm:searchTerm
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	var SearchProxy = {
		attach: function(search) {
			search.setFilter('contacts', this.filterProxy);
		},
		filterProxy: function(query) {
			searchTerm = query;
			notifyObservers('changeSearch');
		}
	};

	this.getSearchTerm = function() {
		return searchTerm;
	};

	this.cleanSearch = function() {
		if (!_.isUndefined($('.searchbox'))) {
			$('.searchbox')[0].reset();
		}
		searchTerm = '';
	};

	if (!_.isUndefined(OC.Plugins)) {
		OC.Plugins.register('OCA.Search', SearchProxy);
		if (!_.isUndefined(OCA.Search)) {
			OC.Search = new OCA.Search($('#searchbox'), $('#searchresults'));
			$('#searchbox').show();
		}
	}

	if (!_.isUndefined($('.searchbox'))) {
		$('.searchbox')[0].addEventListener('keypress', function(e) {
			if(e.keyCode === 13) {
				notifyObservers('submitSearch');
			}
		});
	}
});

angular.module('contactsApp')
.service('SettingsService', function() {
	var settings = {
		addressBooks: [
			'testAddr'
		]
	};

	this.set = function(key, value) {
		settings[key] = value;
	};

	this.get = function(key) {
		return settings[key];
	};

	this.getAll = function() {
		return settings;
	};
});

angular.module('contactsApp')
.service('SortByService', function () {
	var subscriptions = [];

	// Array of keys to sort by. Ordered by priorities.
	var sortOptions = {
		sortFirstName: ['firstName', 'lastName', 'uid'],
		sortLastName: ['lastName', 'firstName', 'uid'],
		sortDisplayName: ['displayName', 'uid']
	};

	// Key
	var sortBy = 'sortDisplayName';

	var defaultOrder = window.localStorage.getItem('contacts_default_order');
	if (defaultOrder) {
		sortBy = defaultOrder;
	}

	function notifyObservers() {
		angular.forEach(subscriptions, function (subscription) {
			if (typeof subscription === 'function') {
				subscription(sortOptions[sortBy]);
			}
		});
	}

	return {
		subscribe: function (callback) {
			subscriptions.push(callback);
		},
		setSortBy: function (value) {
			sortBy = value;
			window.localStorage.setItem('contacts_default_order', value);
			notifyObservers();
		},
		getSortBy: function () {
			return sortOptions[sortBy];
		},
		getSortByKey: function () {
			return sortBy;
		},
		getSortByList: function () {
			return {
				sortDisplayName: t('contacts', 'Display name'),
				sortFirstName: t('contacts', 'First name'),
				sortLastName: t('contacts', 'Last name')
			};
		}
	};
});

angular.module('contactsApp')
.service('vCardPropertiesService', function() {
	/**
	 * map vCard attributes to internal attributes
	 *
	 * propName: {
	 * 		multiple: [Boolean], // is this prop allowed more than once? (default = false)
	 * 		readableName: [String], // internationalized readable name of prop
	 * 		template: [String], // template name found in /templates/detailItems
	 * 		[...] // optional additional information which might get used by the template
	 *
	 *		options: If multiple options have the same name, the first will be used as default.
	 *				 Others will be merge, but still supported. Order is important!
	 * }
	 */
	this.vCardMeta = {
		nickname: {
			readableName: t('contacts', 'Nickname'),
			template: 'text',
			icon: 'icon-user'
		},
		n: {
			readableName: t('contacts', 'Detailed name'),
			defaultValue: {
				value:['', '', '', '', '']
			},
			template: 'n',
			icon: 'icon-user'
		},
		note: {
			readableName: t('contacts', 'Notes'),
			template: 'textarea',
			icon: 'icon-rename'
		},
		url: {
			multiple: true,
			readableName: t('contacts', 'Website'),
			template: 'url',
			icon: 'icon-public'
		},
		cloud: {
			multiple: true,
			readableName: t('contacts', 'Federated Cloud ID'),
			template: 'text',
			defaultValue: {
				value:[''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]		},
		adr: {
			multiple: true,
			readableName: t('contacts', 'Address'),
			template: 'adr',
			icon: 'icon-address',
			defaultValue: {
				value:['', '', '', '', '', '', ''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		categories: {
			readableName: t('contacts', 'Groups'),
			template: 'groups'
		},
		bday: {
			readableName: t('contacts', 'Birthday'),
			template: 'date',
			icon: 'icon-calendar-dark'
		},
		anniversary: {
			readableName: t('contacts', 'Anniversary'),
			template: 'date',
			icon: 'icon-calendar-dark'
		},
		deathdate: {
			readableName: t('contacts', 'Date of death'),
			template: 'date',
			icon: 'icon-calendar-dark'
		},
		email: {
			multiple: true,
			readableName: t('contacts', 'Email'),
			template: 'email',
			icon: 'icon-mail',
			defaultValue: {
				value:'',
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		impp: {
			multiple: true,
			readableName: t('contacts', 'Instant messaging'),
			template: 'username',
			icon: 'icon-comment',
			defaultValue: {
				value:[''],
				meta:{type:['SKYPE']}
			},
			options: [
				{id: 'IRC', name: 'IRC'},
				{id: 'KIK', name: 'KiK'},
				{id: 'SKYPE', name: 'Skype'},
				{id: 'TELEGRAM', name: 'Telegram'},
				{id: 'XMPP', name:'XMPP'}
			]
		},
		tel: {
			multiple: true,
			readableName: t('contacts', 'Phone'),
			template: 'tel',
			icon: 'icon-comment',
			defaultValue: {
				value:'',
				meta:{type:['HOME,VOICE']}
			},
			options: [
				{id: 'HOME,VOICE', name: t('contacts', 'Home')},
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK,VOICE', name: t('contacts', 'Work')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'CELL', name: t('contacts', 'Mobile')},
				{id: 'CELL,VOICE', name: t('contacts', 'Mobile')},
				{id: 'WORK,CELL', name: t('contacts', 'Work mobile')},
				{id: 'FAX', name: t('contacts', 'Fax')},
				{id: 'HOME,FAX', name: t('contacts', 'Fax home')},
				{id: 'WORK,FAX', name: t('contacts', 'Fax work')},
				{id: 'PAGER', name: t('contacts', 'Pager')},
				{id: 'VOICE', name: t('contacts', 'Voice')},
				{id: 'CAR', name: t('contacts', 'Car')},
				{id: 'PAGER', name: t('contacts', 'Pager')},
				{id: 'WORK,PAGER', name: t('contacts', 'Work pager')}
			]
		},
		'X-SOCIALPROFILE': {
			multiple: true,
			readableName: t('contacts', 'Social network'),
			template: 'username',
			defaultValue: {
				value:[''],
				meta:{type:['facebook']}
			},
			options: [
				{id: 'FACEBOOK', name: 'Facebook'},
				{id: 'GITHUB', name: 'GitHub'},
				{id: 'GOOGLEPLUS', name: 'Google+'},
				{id: 'INSTAGRAM', name: 'Instagram'},
				{id: 'LINKEDIN', name: 'LinkedIn'},
				{id: 'PINTEREST', name: 'Pinterest'},
				{id: 'QZONE', name: 'QZone'},
				{id: 'TUMBLR', name: 'Tumblr'},
				{id: 'TWITTER', name: 'Twitter'},
				{id: 'WECHAT', name: 'WeChat'},
				{id: 'YOUTUBE', name: 'YouTube'}


			]
		},
		relationship: {
			readableName: t('contacts', 'Relationship'),
			template: 'select',
			info: t('contacts', 'Specify a relationship between you and the entity represented by this vCard.'),
			options: [
				{id: 'SPOUSE', name: t('contacts', 'Spouse')},
				{id: 'CHILD', name: t('contacts', 'Child')},
				{id: 'MOTHER', name: t('contacts', 'Mother')},
				{id: 'FATHER', name: t('contacts', 'Father')},
				{id: 'PARENT', name: t('contacts', 'Parent')},
				{id: 'BROTHER', name: t('contacts', 'Brother')},
				{id: 'SISTER', name: t('contacts', 'Sister')},
				{id: 'RELATIVE', name: t('contacts', 'Relative')},
				{id: 'FRIEND', name: t('contacts', 'Friend')},
				{id: 'COLLEAGUE', name: t('contacts', 'Colleague')},
				{id: 'MANAGER', name: t('contacts', 'Manager')},
				{id: 'ASSISTANT', name: t('contacts', 'Assistant')},
			]
		},
		related: {
			multiple: true,
			readableName: t('contacts', 'Related'),
			template: 'text',
			info: t('contacts', 'Specify a relationship between another entity and the entity represented by this vCard.'),
			defaultValue: {
				value:[''],
				meta:{type:['CONTACT']}
			},
			options: [
				{id: 'CONTACT', name: t('contacts', 'Contact')},
				{id: 'AGENT', name: t('contacts', 'Agent')},
				{id: 'EMERGENCY', name: t('contacts', 'Emergency')},
				{id: 'FRIEND', name: t('contacts', 'Friend')},
				{id: 'COLLEAGUE', name: t('contacts', 'Colleague')},
				{id: 'COWORKER', name: t('contacts', 'Co-worker')},
				{id: 'MANAGER', name: t('contacts', 'Manager')},
				{id: 'ASSISTANT', name: t('contacts', 'Assistant')},
				{id: 'SPOUSE', name: t('contacts', 'Spouse')},
				{id: 'CHILD', name: t('contacts', 'Child')},
				{id: 'MOTHER', name: t('contacts', 'Mother')},
				{id: 'FATHER', name: t('contacts', 'Father')},
				{id: 'PARENT', name: t('contacts', 'Parent')},
				{id: 'BROTHER', name: t('contacts', 'Brother')},
				{id: 'SISTER', name: t('contacts', 'Sister')},
				{id: 'RELATIVE', name: t('contacts', 'Relative')}
			]
		},
		gender: {
			readableName: t('contacts', 'Gender'),
			template: 'select',
			options: [
				{id: 'F', name: t('contacts', 'Female')},
				{id: 'M', name: t('contacts', 'Male')},
				{id: 'O', name: t('contacts', 'Other')}
			]
		}
	};

	this.fieldOrder = [
		'org',
		'title',
		'tel',
		'email',
		'adr',
		'impp',
		'nick',
		'bday',
		'anniversary',
		'deathdate',
		'url',
		'X-SOCIALPROFILE',
		'relationship',
		'related',
		'note',
		'categories',
		'role',
		'gender'
	];

	this.fieldDefinitions = [];
	for (var prop in this.vCardMeta) {
		this.fieldDefinitions.push({id: prop, name: this.vCardMeta[prop].readableName, multiple: !!this.vCardMeta[prop].multiple});
	}

	this.fallbackMeta = function(property) {
		function capitalize(string) { return string.charAt(0).toUpperCase() + string.slice(1); }
		return {
			name: 'unknown-' + property,
			readableName: capitalize(property),
			template: 'hidden',
			necessity: 'optional',
			hidden: true
		};
	};

	this.getMeta = function(property) {
		return this.vCardMeta[property] || this.fallbackMeta(property);
	};

});

angular.module('contactsApp')
.filter('JSON2vCard', function() {
	return function(input) {
		return vCard.generate(input);
	};
});

angular.module('contactsApp')
.filter('contactColor', function() {
	return function(input) {
		// Check if core has the new color generator
		if(typeof input.toRgb === 'function') {
			var rgb = input.toRgb();
			return 'rgb('+rgb['r']+', '+rgb['g']+', '+rgb['b']+')';
		} else if(typeof input.toHsl === 'function') {
			var hsl = input.toHsl();
			return 'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)';
		} else {
			// If not, we use the old one
			/* global md5 */
			var hash = md5(input).substring(0, 4),
				maxRange = parseInt('ffff', 16),
				hue = parseInt(hash, 16) / maxRange * 256;
			return 'hsl(' + hue + ', 90%, 65%)';
		}
	};
});
angular.module('contactsApp')
.filter('contactGroupFilter', function() {
	'use strict';
	return function (contacts, group) {
		if (typeof contacts === 'undefined') {
			return contacts;
		}
		if (typeof group === 'undefined' || group.toLowerCase() === t('contacts', 'All contacts').toLowerCase()) {
			return contacts;
		}
		var filter = [];
		if (contacts.length > 0) {
			for (var i = 0; i < contacts.length; i++) {
				if (group.toLowerCase() === t('contacts', 'Not grouped').toLowerCase()) {
					if (contacts[i].categories().length === 0) {
						filter.push(contacts[i]);
					}
				} else {
					if (contacts[i].categories().indexOf(group) >= 0) {
						filter.push(contacts[i]);
					}
				}
			}
		}
		return filter;
	};
});

// from https://docs.nextcloud.com/server/11/developer_manual/app/css.html#menus
angular.module('contactsApp')
.filter('counterFormatter', function () {
	'use strict';
	return function (count) {
		if (count > 9999) {
			return '9999+';
		}
		if (count === 0) {
			return '';
		}
		return count;
	};
});


angular.module('contactsApp')
.filter('counterTooltipDisplay', function () {
	'use strict';
	return function (count) {
		if (count > 9999) {
			return count;
		}
		return '';
	};
});



angular.module('contactsApp')
.filter('fieldFilter', function() {
	'use strict';
	return function (fields, contact) {
		if (typeof fields === 'undefined') {
			return fields;
		}
		if (typeof contact === 'undefined') {
			return fields;
		}
		var filter = [];
		if (fields.length > 0) {
			for (var i = 0; i < fields.length; i++) {
				if (fields[i].multiple ) {
					filter.push(fields[i]);
					continue;
				}
				if (_.isUndefined(contact.getProperty(fields[i].id))) {
					filter.push(fields[i]);
				}
			}
		}
		return filter;
	};
});

angular.module('contactsApp')
.filter('firstCharacter', function() {
	return function(input) {
		return input.charAt(0);
	};
});

angular.module('contactsApp')
.filter('localeOrderBy', [function () {
	return function (array, sortPredicate, reverseOrder) {
		if (!Array.isArray(array)) return array;
		if (!sortPredicate) return array;

		var arrayCopy = [];
		angular.forEach(array, function (item) {
			arrayCopy.push(item);
		});

		arrayCopy.sort(function (a, b) {


			// Did we pass multiple sorting options? If not, create an array anyway.
			sortPredicate = angular.isArray(sortPredicate) ? sortPredicate: [sortPredicate];
			// Let's test the first sort and continue if no sort occured
			for(var i=0; i<sortPredicate.length; i++) {
				var sortBy = sortPredicate[i];

				var valueA = a[sortBy];
				if (angular.isFunction(valueA)) {
					valueA = a[sortBy]();
				}
				var valueB = b[sortBy];
				if (angular.isFunction(valueB)) {
					valueB = b[sortBy]();
				}

				// Start sorting
				if (angular.isString(valueA)) {
					if(valueA !== valueB) {
						return reverseOrder ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
					}
				}

				if (angular.isNumber(valueA) || typeof valueA === 'boolean') {
					if(valueA !== valueB) {
						return reverseOrder ? valueB - valueA : valueA - valueB;
					}
				}
			}

			return 0;
		});

		return arrayCopy;
	};
}]);

angular.module('contactsApp')
.filter('newContact', function() {
	return function(input) {
		return input !== '' ? input : t('contacts', 'New contact');
	};
});

angular.module('contactsApp')
.filter('orderDetailItems', ['vCardPropertiesService', function(vCardPropertiesService) {
	'use strict';
	return function(items, field, reverse) {

		var filtered = [];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});

		var fieldOrder = angular.copy(vCardPropertiesService.fieldOrder);
		// reverse to move custom items to the end (indexOf == -1)
		fieldOrder.reverse();

		filtered.sort(function (a, b) {
			if(fieldOrder.indexOf(a[field]) < fieldOrder.indexOf(b[field])) {
				return 1;
			}
			if(fieldOrder.indexOf(a[field]) > fieldOrder.indexOf(b[field])) {
				return -1;
			}
			return 0;
		});

		if(reverse) filtered.reverse();
		return filtered;
	};
}]);

angular.module('contactsApp')
.filter('toArray', function() {
	return function(obj) {
		if (!(obj instanceof Object)) return obj;
		return _.map(obj, function(val, key) {
			return Object.defineProperty(val, '$key', {value: key});
		});
	};
});

angular.module('contactsApp')
.filter('vCard2JSON', function() {
	return function(input) {
		return vCard.parse(input);
	};
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJkYXRlcGlja2VyX2RpcmVjdGl2ZS5qcyIsImZvY3VzX2RpcmVjdGl2ZS5qcyIsImlucHV0cmVzaXplX2RpcmVjdGl2ZS5qcyIsInNlbGVjdF9kaXJlY3RpdmUuanMiLCJhZGRyZXNzQm9vay9hZGRyZXNzQm9va19jb250cm9sbGVyLmpzIiwiYWRkcmVzc0Jvb2svYWRkcmVzc0Jvb2tfZGlyZWN0aXZlLmpzIiwiYWRkcmVzc0Jvb2tMaXN0L2FkZHJlc3NCb29rTGlzdF9jb250cm9sbGVyLmpzIiwiYWRkcmVzc0Jvb2tMaXN0L2FkZHJlc3NCb29rTGlzdF9kaXJlY3RpdmUuanMiLCJhdmF0YXIvYXZhdGFyX2NvbnRyb2xsZXIuanMiLCJhdmF0YXIvYXZhdGFyX2RpcmVjdGl2ZS5qcyIsImNvbnRhY3QvY29udGFjdF9jb250cm9sbGVyLmpzIiwiY29udGFjdC9jb250YWN0X2RpcmVjdGl2ZS5qcyIsImNvbnRhY3REZXRhaWxzL2NvbnRhY3REZXRhaWxzX2NvbnRyb2xsZXIuanMiLCJjb250YWN0RGV0YWlscy9jb250YWN0RGV0YWlsc19kaXJlY3RpdmUuanMiLCJjb250YWN0RmlsdGVyL2NvbnRhY3RGaWx0ZXJfY29udHJvbGxlci5qcyIsImNvbnRhY3RGaWx0ZXIvY29udGFjdEZpbHRlcl9kaXJlY3RpdmUuanMiLCJjb250YWN0SW1wb3J0L2NvbnRhY3RJbXBvcnRfY29udHJvbGxlci5qcyIsImNvbnRhY3RJbXBvcnQvY29udGFjdEltcG9ydF9kaXJlY3RpdmUuanMiLCJjb250YWN0TGlzdC9jb250YWN0TGlzdF9jb250cm9sbGVyLmpzIiwiY29udGFjdExpc3QvY29udGFjdExpc3RfZGlyZWN0aXZlLmpzIiwiZGV0YWlsc0l0ZW0vZGV0YWlsc0l0ZW1fY29udHJvbGxlci5qcyIsImRldGFpbHNJdGVtL2RldGFpbHNJdGVtX2RpcmVjdGl2ZS5qcyIsImdyb3VwL2dyb3VwX2NvbnRyb2xsZXIuanMiLCJncm91cC9ncm91cF9kaXJlY3RpdmUuanMiLCJncm91cExpc3QvZ3JvdXBMaXN0X2NvbnRyb2xsZXIuanMiLCJncm91cExpc3QvZ3JvdXBMaXN0X2RpcmVjdGl2ZS5qcyIsImltcG9ydFNjcmVlbi9pbXBvcnRTY3JlZW5fY29udHJvbGxlci5qcyIsImltcG9ydFNjcmVlbi9pbXBvcnRTY3JlZW5fZGlyZWN0aXZlLmpzIiwibmV3Q29udGFjdEJ1dHRvbi9uZXdDb250YWN0QnV0dG9uX2NvbnRyb2xsZXIuanMiLCJuZXdDb250YWN0QnV0dG9uL25ld0NvbnRhY3RCdXR0b25fZGlyZWN0aXZlLmpzIiwicGFyc2Vycy90ZWxNb2RlbF9kaXJlY3RpdmUuanMiLCJwcm9wZXJ0eUdyb3VwL3Byb3BlcnR5R3JvdXBfY29udHJvbGxlci5qcyIsInByb3BlcnR5R3JvdXAvcHJvcGVydHlHcm91cF9kaXJlY3RpdmUuanMiLCJzb3J0Qnkvc29ydEJ5X2NvbnRyb2xsZXIuanMiLCJzb3J0Qnkvc29ydEJ5X2RpcmVjdGl2ZS5qcyIsImFkZHJlc3NCb29rX21vZGVsLmpzIiwiY29udGFjdEZpbHRlcl9tb2RlbC5qcyIsImNvbnRhY3RfbW9kZWwuanMiLCJncm91cF9tb2RlbC5qcyIsImFkZHJlc3NCb29rX3NlcnZpY2UuanMiLCJjb250YWN0X3NlcnZpY2UuanMiLCJkYXZDbGllbnRfc2VydmljZS5qcyIsImRhdl9zZXJ2aWNlLmpzIiwiaW1wb3J0X3NlcnZpY2UuanMiLCJtaW1lX3NlcnZpY2UuanMiLCJzZWFyY2hfc2VydmljZS5qcyIsInNldHRpbmdzX3NlcnZpY2UuanMiLCJzb3J0Qnlfc2VydmljZS5qcyIsInZDYXJkUHJvcGVydGllcy5qcyIsIkpTT04ydkNhcmRfZmlsdGVyLmpzIiwiY29udGFjdENvbG9yX2ZpbHRlci5qcyIsImNvbnRhY3RHcm91cF9maWx0ZXIuanMiLCJjb3VudGVyRm9ybWF0dGVyX2ZpbHRlci5qcyIsImNvdW50ZXJUb29sdGlwRGlzcGxheV9maWx0ZXIuanMiLCJmaWVsZF9maWx0ZXIuanMiLCJmaXJzdENoYXJhY3Rlcl9maWx0ZXIuanMiLCJsb2NhbGVPcmRlckJ5X2ZpbHRlci5qcyIsIm5ld0NvbnRhY3RfZmlsdGVyLmpzIiwib3JkZXJEZXRhaWxJdGVtc19maWx0ZXIuanMiLCJ0b0FycmF5X2ZpbHRlci5qcyIsInZDYXJkMkpTT05fZmlsdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7O0FBVUEsUUFBUSxPQUFPLGVBQWUsQ0FBQyxTQUFTLGlCQUFpQixXQUFXLGdCQUFnQixhQUFhLGNBQWMseUJBQXlCO0NBQ3ZJLDBCQUFPLFNBQVMsZ0JBQWdCOztDQUVoQyxlQUFlLEtBQUssU0FBUztFQUM1QixVQUFVOzs7Q0FHWCxlQUFlLEtBQUssaUJBQWlCO0VBQ3BDLFlBQVksU0FBUyxZQUFZO0dBQ2hDLE9BQU8sTUFBTSxFQUFFLFlBQVksa0JBQWtCLE1BQU0sV0FBVzs7OztDQUloRSxlQUFlLEtBQUssY0FBYztFQUNqQyxVQUFVOzs7Q0FHWCxlQUFlLFVBQVUsTUFBTSxFQUFFLFlBQVk7OztBQUc5QztBQzlCQSxRQUFRLE9BQU87Q0FDZCxVQUFVLDJCQUFjLFNBQVMsVUFBVTtDQUMzQyxJQUFJLGlCQUFpQixVQUFVLE9BQU8sU0FBUyxPQUFPLGFBQWE7RUFDbEUsU0FBUyxXQUFXO0dBQ25CLFFBQVEsV0FBVztJQUNsQixXQUFXO0lBQ1gsU0FBUztJQUNULFNBQVM7SUFDVCxnQkFBZ0I7SUFDaEIsU0FBUyxVQUFVLE1BQU0sSUFBSTtLQUM1QixJQUFJLEdBQUcsZUFBZSxNQUFNO01BQzNCLE9BQU8sTUFBTTs7S0FFZCxJQUFJLEdBQUcsZUFBZSxLQUFLO01BQzFCLE9BQU8sTUFBTTs7S0FFZCxJQUFJLEdBQUcsZUFBZSxJQUFJO01BQ3pCLE9BQU8sTUFBTTs7S0FFZCxZQUFZLGNBQWM7S0FDMUIsTUFBTTs7Ozs7Q0FLVixPQUFPO0VBQ04sVUFBVTtFQUNWLFVBQVU7RUFDVixZQUFZO0VBQ1osT0FBTzs7O0FBR1Q7QUNoQ0EsUUFBUSxPQUFPO0NBQ2QsVUFBVSxnQ0FBbUIsVUFBVSxVQUFVO0NBQ2pE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ZCxPQUFPLCtDQUFvQixTQUFTLHdCQUF3QjtDQUM1RDtDQUNBLE9BQU8sU0FBUyxPQUFPLE9BQU8sU0FBUzs7RUFFdEMsSUFBSSxXQUFXO0VBQ2YsUUFBUSxRQUFRLE9BQU8sU0FBUyxNQUFNO0dBQ3JDLFNBQVMsS0FBSzs7O0VBR2YsSUFBSSxhQUFhLFFBQVEsS0FBSyx1QkFBdUI7O0VBRXJELFdBQVc7O0VBRVgsU0FBUyxLQUFLLFVBQVUsR0FBRyxHQUFHO0dBQzdCLEdBQUcsV0FBVyxRQUFRLEVBQUUsVUFBVSxXQUFXLFFBQVEsRUFBRSxTQUFTO0lBQy9ELE9BQU87O0dBRVIsR0FBRyxXQUFXLFFBQVEsRUFBRSxVQUFVLFdBQVcsUUFBUSxFQUFFLFNBQVM7SUFDL0QsT0FBTyxDQUFDOztHQUVULE9BQU87OztFQUdSLEdBQUcsU0FBUyxTQUFTO0VBQ3JCLE9BQU87OztBQUdUO0FDNUJBLFFBQVEsT0FBTztDQUNkLE9BQU8sV0FBVyxXQUFXO0NBQzdCLE9BQU8sU0FBUyxLQUFLO0VBQ3BCLElBQUksRUFBRSxlQUFlLFNBQVMsT0FBTztFQUNyQyxPQUFPLEVBQUUsSUFBSSxLQUFLLFNBQVMsS0FBSyxLQUFLO0dBQ3BDLE9BQU8sT0FBTyxlQUFlLEtBQUssUUFBUSxDQUFDLE9BQU87Ozs7QUFJckQ7QUNUQSxRQUFRLE9BQU87Q0FDZCxPQUFPLGNBQWMsV0FBVztDQUNoQyxPQUFPLFNBQVMsT0FBTztFQUN0QixPQUFPLE1BQU0sTUFBTTs7O0FBR3JCIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTmV4dGNsb3VkIC0gY29udGFjdHNcbiAqXG4gKiBUaGlzIGZpbGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEFmZmVybyBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIHZlcnNpb24gMyBvclxuICogbGF0ZXIuIFNlZSB0aGUgQ09QWUlORyBmaWxlLlxuICpcbiAqIEBhdXRob3IgSGVuZHJpayBMZXBwZWxzYWNrIDxoZW5kcmlrQGxlcHBlbHNhY2suZGU+XG4gKiBAY29weXJpZ2h0IEhlbmRyaWsgTGVwcGVsc2FjayAyMDE1XG4gKi9cblxuYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJywgWyd1dWlkNCcsICdhbmd1bGFyLWNhY2hlJywgJ25nUm91dGUnLCAndWkuYm9vdHN0cmFwJywgJ3VpLnNlbGVjdCcsICduZ1Nhbml0aXplJywgJ2FuZ3VsYXItY2xpY2stb3V0c2lkZScsICduZ2NsaXBib2FyZCddKVxuLmNvbmZpZyhmdW5jdGlvbigkcm91dGVQcm92aWRlcikge1xuXG5cdCRyb3V0ZVByb3ZpZGVyLndoZW4oJy86Z2lkJywge1xuXHRcdHRlbXBsYXRlOiAnPGNvbnRhY3RkZXRhaWxzPjwvY29udGFjdGRldGFpbHM+J1xuXHR9KTtcblxuXHQkcm91dGVQcm92aWRlci53aGVuKCcvY29udGFjdC86dWlkJywge1xuXHRcdHJlZGlyZWN0VG86IGZ1bmN0aW9uKHBhcmFtZXRlcnMpIHtcblx0XHRcdHJldHVybiAnLycgKyB0KCdjb250YWN0cycsICdBbGwgY29udGFjdHMnKSArICcvJyArIHBhcmFtZXRlcnMudWlkO1xuXHRcdH1cblx0fSk7XG5cblx0JHJvdXRlUHJvdmlkZXIud2hlbignLzpnaWQvOnVpZCcsIHtcblx0XHR0ZW1wbGF0ZTogJzxjb250YWN0ZGV0YWlscz48L2NvbnRhY3RkZXRhaWxzPidcblx0fSk7XG5cblx0JHJvdXRlUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyArIHQoJ2NvbnRhY3RzJywgJ0FsbCBjb250YWN0cycpKTtcblxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnZGF0ZXBpY2tlcicsIGZ1bmN0aW9uKCR0aW1lb3V0KSB7XG5cdHZhciBsb2FkRGF0ZXBpY2tlciA9IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWxDdHJsKSB7XG5cdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRlbGVtZW50LmRhdGVwaWNrZXIoe1xuXHRcdFx0XHRkYXRlRm9ybWF0Oid5eS1tbS1kZCcsXG5cdFx0XHRcdG1pbkRhdGU6IG51bGwsXG5cdFx0XHRcdG1heERhdGU6IG51bGwsXG5cdFx0XHRcdGNvbnN0cmFpbklucHV0OiBmYWxzZSxcblx0XHRcdFx0b25TZWxlY3Q6ZnVuY3Rpb24gKGRhdGUsIGRwKSB7XG5cdFx0XHRcdFx0aWYgKGRwLnNlbGVjdGVkWWVhciA8IDEwMDApIHtcblx0XHRcdFx0XHRcdGRhdGUgPSAnMCcgKyBkYXRlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZHAuc2VsZWN0ZWRZZWFyIDwgMTAwKSB7XG5cdFx0XHRcdFx0XHRkYXRlID0gJzAnICsgZGF0ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRwLnNlbGVjdGVkWWVhciA8IDEwKSB7XG5cdFx0XHRcdFx0XHRkYXRlID0gJzAnICsgZGF0ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShkYXRlKTtcblx0XHRcdFx0XHRzY29wZS4kYXBwbHkoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRyZXF1aXJlIDogJ25nTW9kZWwnLFxuXHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0bGluayA6IGxvYWREYXRlcGlja2VyXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdmb2N1c0V4cHJlc3Npb24nLCBmdW5jdGlvbiAoJHRpbWVvdXQpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdGxpbms6IHtcblx0XHRcdHBvc3Q6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXHRcdFx0XHRzY29wZS4kd2F0Y2goYXR0cnMuZm9jdXNFeHByZXNzaW9uLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKGF0dHJzLmZvY3VzRXhwcmVzc2lvbikge1xuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLiRldmFsKGF0dHJzLmZvY3VzRXhwcmVzc2lvbikpIHtcblx0XHRcdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LmlzKCdpbnB1dCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQuZmluZCgnaW5wdXQnKS5mb2N1cygpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSwgMTAwKTsgLy9uZWVkIHNvbWUgZGVsYXkgdG8gd29yayB3aXRoIG5nLWRpc2FibGVkXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdpbnB1dHJlc2l6ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0bGluayA6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuXHRcdFx0dmFyIGVsSW5wdXQgPSBlbGVtZW50LnZhbCgpO1xuXHRcdFx0ZWxlbWVudC5iaW5kKCdrZXlkb3duIGtleXVwIGxvYWQgZm9jdXMnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0ZWxJbnB1dCA9IGVsZW1lbnQudmFsKCk7XG5cdFx0XHRcdC8vIElmIHNldCB0byAwLCB0aGUgbWluLXdpZHRoIGNzcyBkYXRhIGlzIGlnbm9yZWRcblx0XHRcdFx0dmFyIGxlbmd0aCA9IGVsSW5wdXQubGVuZ3RoID4gMSA/IGVsSW5wdXQubGVuZ3RoIDogMTtcblx0XHRcdFx0ZWxlbWVudC5hdHRyKCdzaXplJywgbGVuZ3RoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ3NlbGVjdEV4cHJlc3Npb24nLCBmdW5jdGlvbiAoJHRpbWVvdXQpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdGxpbms6IHtcblx0XHRcdHBvc3Q6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXHRcdFx0XHRzY29wZS4kd2F0Y2goYXR0cnMuc2VsZWN0RXhwcmVzc2lvbiwgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGlmIChhdHRycy5zZWxlY3RFeHByZXNzaW9uKSB7XG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuJGV2YWwoYXR0cnMuc2VsZWN0RXhwcmVzc2lvbikpIHtcblx0XHRcdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LmlzKCdpbnB1dCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LnNlbGVjdCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LmZpbmQoJ2lucHV0Jykuc2VsZWN0KCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LCAxMDApOyAvL25lZWQgc29tZSBkZWxheSB0byB3b3JrIHdpdGggbmctZGlzYWJsZWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdhZGRyZXNzYm9va0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEFkZHJlc3NCb29rU2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC50ID0ge1xuXHRcdGRvd25sb2FkOiB0KCdjb250YWN0cycsICdEb3dubG9hZCcpLFxuXHRcdGNvcHlVUkw6IHQoJ2NvbnRhY3RzJywgJ0NvcHkgbGluaycpLFxuXHRcdGNsaWNrVG9Db3B5OiB0KCdjb250YWN0cycsICdDbGljayB0byBjb3B5IHRoZSBsaW5rIHRvIHlvdXIgY2xpcGJvYXJkJyksXG5cdFx0c2hhcmVBZGRyZXNzYm9vazogdCgnY29udGFjdHMnLCAnVG9nZ2xlIHNoYXJpbmcnKSxcblx0XHRkZWxldGVBZGRyZXNzYm9vazogdCgnY29udGFjdHMnLCAnRGVsZXRlJyksXG5cdFx0cmVuYW1lQWRkcmVzc2Jvb2s6IHQoJ2NvbnRhY3RzJywgJ1JlbmFtZScpLFxuXHRcdHNoYXJlSW5wdXRQbGFjZUhvbGRlcjogdCgnY29udGFjdHMnLCAnU2hhcmUgd2l0aCB1c2VycyBvciBncm91cHMnKSxcblx0XHRkZWxldGU6IHQoJ2NvbnRhY3RzJywgJ0RlbGV0ZScpLFxuXHRcdGNhbkVkaXQ6IHQoJ2NvbnRhY3RzJywgJ2NhbiBlZGl0JyksXG5cdFx0Y2xvc2U6IHQoJ2NvbnRhY3RzJywgJ0Nsb3NlJyksXG5cdFx0ZW5hYmxlZDogdCgnY29udGFjdHMnLCAnRW5hYmxlZCcpLFxuXHRcdGRpc2FibGVkOiB0KCdjb250YWN0cycsICdEaXNhYmxlZCcpXG5cdH07XG5cblx0Y3RybC5lZGl0aW5nID0gZmFsc2U7XG5cdGN0cmwuZW5hYmxlZCA9IGN0cmwuYWRkcmVzc0Jvb2suZW5hYmxlZDtcblxuXHRjdHJsLnRvb2x0aXBJc09wZW4gPSBmYWxzZTtcblx0Y3RybC50b29sdGlwVGl0bGUgPSBjdHJsLnQuY2xpY2tUb0NvcHk7XG5cdGN0cmwuc2hvd0lucHV0VXJsID0gZmFsc2U7XG5cblx0Y3RybC5jbGlwYm9hcmRTdWNjZXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0Y3RybC50b29sdGlwSXNPcGVuID0gdHJ1ZTtcblx0XHRjdHJsLnRvb2x0aXBUaXRsZSA9IHQoJ2NvcmUnLCAnQ29waWVkIScpO1xuXHRcdF8uZGVsYXkoZnVuY3Rpb24oKSB7XG5cdFx0XHRjdHJsLnRvb2x0aXBJc09wZW4gPSBmYWxzZTtcblx0XHRcdGN0cmwudG9vbHRpcFRpdGxlID0gY3RybC50LmNsaWNrVG9Db3B5O1xuXHRcdH0sIDMwMDApO1xuXHR9O1xuXG5cdGN0cmwuY2xpcGJvYXJkRXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLnNob3dJbnB1dFVybCA9IHRydWU7XG5cdFx0aWYgKC9pUGhvbmV8aVBhZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRcdGN0cmwuSW5wdXRVcmxUb29sdGlwID0gdCgnY29yZScsICdOb3Qgc3VwcG9ydGVkIScpO1xuXHRcdH0gZWxzZSBpZiAoL01hYy9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRcdGN0cmwuSW5wdXRVcmxUb29sdGlwID0gdCgnY29yZScsICdQcmVzcyDijJgtQyB0byBjb3B5LicpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdHJsLklucHV0VXJsVG9vbHRpcCA9IHQoJ2NvcmUnLCAnUHJlc3MgQ3RybC1DIHRvIGNvcHkuJyk7XG5cdFx0fVxuXHRcdCQoJyNhZGRyZXNzQm9va1VybF8nK2N0cmwuYWRkcmVzc0Jvb2suY3RhZykuc2VsZWN0KCk7XG5cdH07XG5cblx0Y3RybC5yZW5hbWVBZGRyZXNzQm9vayA9IGZ1bmN0aW9uKCkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5yZW5hbWUoY3RybC5hZGRyZXNzQm9vaywgY3RybC5hZGRyZXNzQm9vay5kaXNwbGF5TmFtZSk7XG5cdFx0Y3RybC5lZGl0aW5nID0gZmFsc2U7XG5cdH07XG5cblx0Y3RybC5lZGl0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Y3RybC5lZGl0aW5nID0gdHJ1ZTtcblx0fTtcblxuXHRjdHJsLmNsb3NlTWVudXMgPSBmdW5jdGlvbigpIHtcblx0XHQkc2NvcGUuJHBhcmVudC5jdHJsLm9wZW5lZE1lbnUgPSBmYWxzZTtcblx0fTtcblxuXHRjdHJsLm9wZW5NZW51ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRjdHJsLmNsb3NlTWVudXMoKTtcblx0XHQkc2NvcGUuJHBhcmVudC5jdHJsLm9wZW5lZE1lbnUgPSBpbmRleDtcblx0fTtcblxuXHRjdHJsLnRvZ2dsZU1lbnUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdGlmICgkc2NvcGUuJHBhcmVudC5jdHJsLm9wZW5lZE1lbnUgPT09IGluZGV4KSB7XG5cdFx0XHRjdHJsLmNsb3NlTWVudXMoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3RybC5vcGVuTWVudShpbmRleCk7XG5cdFx0fVxuXHR9O1xuXG5cdGN0cmwudG9nZ2xlU2hhcmVzRWRpdG9yID0gZnVuY3Rpb24oKSB7XG5cdFx0Y3RybC5lZGl0aW5nU2hhcmVzID0gIWN0cmwuZWRpdGluZ1NoYXJlcztcblx0XHRjdHJsLnNlbGVjdGVkU2hhcmVlID0gbnVsbDtcblx0fTtcblxuXHQvKiBGcm9tIENhbGVuZGFyLVJld29yayAtIGpzL2FwcC9jb250cm9sbGVycy9jYWxlbmRhcmxpc3Rjb250cm9sbGVyLmpzICovXG5cdGN0cmwuZmluZFNoYXJlZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRyZXR1cm4gJC5nZXQoXG5cdFx0XHRPQy5saW5rVG9PQ1MoJ2FwcHMvZmlsZXNfc2hhcmluZy9hcGkvdjEnKSArICdzaGFyZWVzJyxcblx0XHRcdHtcblx0XHRcdFx0Zm9ybWF0OiAnanNvbicsXG5cdFx0XHRcdHNlYXJjaDogdmFsLnRyaW0oKSxcblx0XHRcdFx0cGVyUGFnZTogMjAwLFxuXHRcdFx0XHRpdGVtVHlwZTogJ3ByaW5jaXBhbHMnXG5cdFx0XHR9XG5cdFx0KS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuXHRcdFx0dmFyIHVzZXJzICAgPSByZXN1bHQub2NzLmRhdGEuZXhhY3QudXNlcnMuY29uY2F0KHJlc3VsdC5vY3MuZGF0YS51c2Vycyk7XG5cdFx0XHR2YXIgZ3JvdXBzICA9IHJlc3VsdC5vY3MuZGF0YS5leGFjdC5ncm91cHMuY29uY2F0KHJlc3VsdC5vY3MuZGF0YS5ncm91cHMpO1xuXG5cdFx0XHR2YXIgdXNlclNoYXJlcyA9IGN0cmwuYWRkcmVzc0Jvb2suc2hhcmVkV2l0aC51c2Vycztcblx0XHRcdHZhciB1c2VyU2hhcmVzTGVuZ3RoID0gdXNlclNoYXJlcy5sZW5ndGg7XG5cblx0XHRcdHZhciBncm91cHNTaGFyZXMgPSBjdHJsLmFkZHJlc3NCb29rLnNoYXJlZFdpdGguZ3JvdXBzO1xuXHRcdFx0dmFyIGdyb3Vwc1NoYXJlc0xlbmd0aCA9IGdyb3Vwc1NoYXJlcy5sZW5ndGg7XG5cdFx0XHR2YXIgaSwgajtcblxuXHRcdFx0Ly8gRmlsdGVyIG91dCBjdXJyZW50IHVzZXJcblx0XHRcdGZvciAoaSA9IDAgOyBpIDwgdXNlcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHVzZXJzW2ldLnZhbHVlLnNoYXJlV2l0aCA9PT0gT0MuY3VycmVudFVzZXIpIHtcblx0XHRcdFx0XHR1c2Vycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gTm93IGZpbHRlciBvdXQgYWxsIHNoYXJlZXMgdGhhdCBhcmUgYWxyZWFkeSBzaGFyZWQgd2l0aFxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHVzZXJTaGFyZXNMZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgc2hhcmVVc2VyID0gdXNlclNoYXJlc1tpXTtcblx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IHVzZXJzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdFx0aWYgKHVzZXJzW2pdLnZhbHVlLnNoYXJlV2l0aCA9PT0gc2hhcmVVc2VyLmlkKSB7XG5cdFx0XHRcdFx0XHR1c2Vycy5zcGxpY2UoaiwgMSk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gTm93IGZpbHRlciBvdXQgYWxsIGdyb3VwcyB0aGF0IGFyZSBhbHJlYWR5IHNoYXJlZCB3aXRoXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgZ3JvdXBzU2hhcmVzTGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIHNoYXJlZEdyb3VwID0gZ3JvdXBzU2hhcmVzW2ldO1xuXHRcdFx0XHRmb3IgKGogPSAwOyBqIDwgZ3JvdXBzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdFx0aWYgKGdyb3Vwc1tqXS52YWx1ZS5zaGFyZVdpdGggPT09IHNoYXJlZEdyb3VwLmlkKSB7XG5cdFx0XHRcdFx0XHRncm91cHMuc3BsaWNlKGosIDEpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENvbWJpbmUgdXNlcnMgYW5kIGdyb3Vwc1xuXHRcdFx0dXNlcnMgPSB1c2Vycy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGRpc3BsYXk6IF8uZXNjYXBlKGl0ZW0udmFsdWUuc2hhcmVXaXRoKSxcblx0XHRcdFx0XHR0eXBlOiBPQy5TaGFyZS5TSEFSRV9UWVBFX1VTRVIsXG5cdFx0XHRcdFx0aWRlbnRpZmllcjogaXRlbS52YWx1ZS5zaGFyZVdpdGhcblx0XHRcdFx0fTtcblx0XHRcdH0pO1xuXG5cdFx0XHRncm91cHMgPSBncm91cHMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRkaXNwbGF5OiBfLmVzY2FwZShpdGVtLnZhbHVlLnNoYXJlV2l0aCkgKyAnIChncm91cCknLFxuXHRcdFx0XHRcdHR5cGU6IE9DLlNoYXJlLlNIQVJFX1RZUEVfR1JPVVAsXG5cdFx0XHRcdFx0aWRlbnRpZmllcjogaXRlbS52YWx1ZS5zaGFyZVdpdGhcblx0XHRcdFx0fTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gZ3JvdXBzLmNvbmNhdCh1c2Vycyk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC5vblNlbGVjdFNoYXJlZSA9IGZ1bmN0aW9uIChpdGVtKSB7XG5cdFx0Ly8gUHJldmVudCBzZXR0aW5ncyB0byBzbGlkZSBkb3duXG5cdFx0JCgnI2FwcC1zZXR0aW5ncy1oZWFkZXIgPiBidXR0b24nKS5kYXRhKCdhcHBzLXNsaWRlLXRvZ2dsZScsIGZhbHNlKTtcblx0XHRfLmRlbGF5KGZ1bmN0aW9uKCkge1xuXHRcdFx0JCgnI2FwcC1zZXR0aW5ncy1oZWFkZXIgPiBidXR0b24nKS5kYXRhKCdhcHBzLXNsaWRlLXRvZ2dsZScsICcjYXBwLXNldHRpbmdzLWNvbnRlbnQnKTtcblx0XHR9LCA1MDApO1xuXG5cdFx0Y3RybC5zZWxlY3RlZFNoYXJlZSA9IG51bGw7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnNoYXJlKGN0cmwuYWRkcmVzc0Jvb2ssIGl0ZW0udHlwZSwgaXRlbS5pZGVudGlmaWVyLCBmYWxzZSwgZmFsc2UpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cblx0fTtcblxuXHRjdHJsLnVwZGF0ZUV4aXN0aW5nVXNlclNoYXJlID0gZnVuY3Rpb24odXNlcklkLCB3cml0YWJsZSkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5zaGFyZShjdHJsLmFkZHJlc3NCb29rLCBPQy5TaGFyZS5TSEFSRV9UWVBFX1VTRVIsIHVzZXJJZCwgd3JpdGFibGUsIHRydWUpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC51cGRhdGVFeGlzdGluZ0dyb3VwU2hhcmUgPSBmdW5jdGlvbihncm91cElkLCB3cml0YWJsZSkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5zaGFyZShjdHJsLmFkZHJlc3NCb29rLCBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQLCBncm91cElkLCB3cml0YWJsZSwgdHJ1ZSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLnVuc2hhcmVGcm9tVXNlciA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS51bnNoYXJlKGN0cmwuYWRkcmVzc0Jvb2ssIE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUiwgdXNlcklkKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwudW5zaGFyZUZyb21Hcm91cCA9IGZ1bmN0aW9uKGdyb3VwSWQpIHtcblx0XHRBZGRyZXNzQm9va1NlcnZpY2UudW5zaGFyZShjdHJsLmFkZHJlc3NCb29rLCBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQLCBncm91cElkKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwuZGVsZXRlQWRkcmVzc0Jvb2sgPSBmdW5jdGlvbigpIHtcblx0XHRBZGRyZXNzQm9va1NlcnZpY2UuZGVsZXRlKGN0cmwuYWRkcmVzc0Jvb2spLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC50b2dnbGVTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS50b2dnbGVTdGF0ZShjdHJsLmFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRjdHJsLmVuYWJsZWQgPSBhZGRyZXNzQm9vay5lbmFibGVkO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXHR9O1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdhZGRyZXNzYm9vaycsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsIC8vIGhhcyB0byBiZSBhbiBhdHRyaWJ1dGUgdG8gd29yayB3aXRoIGNvcmUgY3NzXG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdhZGRyZXNzYm9va0N0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdGFkZHJlc3NCb29rOiAnPWRhdGEnLFxuXHRcdFx0bGlzdDogJz0nXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvYWRkcmVzc0Jvb2suaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignYWRkcmVzc2Jvb2tsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQWRkcmVzc0Jvb2tTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLmxvYWRpbmcgPSB0cnVlO1xuXHRjdHJsLm9wZW5lZE1lbnUgPSBmYWxzZTtcblx0Y3RybC5hZGRyZXNzQm9va1JlZ2V4ID0gL15bYS16QS1aMC05w4Atw79cXHMtXy4hPyN8KCldKyQvaTtcblxuXHRBZGRyZXNzQm9va1NlcnZpY2UuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9va3MpIHtcblx0XHRjdHJsLmFkZHJlc3NCb29rcyA9IGFkZHJlc3NCb29rcztcblx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRpZihjdHJsLmFkZHJlc3NCb29rcy5sZW5ndGggPT09IDApIHtcblx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5jcmVhdGUodCgnY29udGFjdHMnLCAnQ29udGFjdHMnKSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmdldEFkZHJlc3NCb29rKHQoJ2NvbnRhY3RzJywgJ0NvbnRhY3RzJykpLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0XHRjdHJsLmFkZHJlc3NCb29rcy5wdXNoKGFkZHJlc3NCb29rKTtcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcblxuXHRjdHJsLnQgPSB7XG5cdFx0YWRkcmVzc0Jvb2tOYW1lIDogdCgnY29udGFjdHMnLCAnQWRkcmVzcyBib29rIG5hbWUnKSxcblx0XHRyZWdleEVycm9yIDogdCgnY29udGFjdHMnLCAnT25seSB0aGVzZSBzcGVjaWFsIGNoYXJhY3RlcnMgYXJlIGFsbG93ZWQ6IC1fLiE/I3woKScpXG5cdH07XG5cblx0Y3RybC5jcmVhdGVBZGRyZXNzQm9vayA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmKGN0cmwubmV3QWRkcmVzc0Jvb2tOYW1lKSB7XG5cdFx0XHRBZGRyZXNzQm9va1NlcnZpY2UuY3JlYXRlKGN0cmwubmV3QWRkcmVzc0Jvb2tOYW1lKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRBZGRyZXNzQm9va1NlcnZpY2UuZ2V0QWRkcmVzc0Jvb2soY3RybC5uZXdBZGRyZXNzQm9va05hbWUpLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0XHRjdHJsLmFkZHJlc3NCb29rcy5wdXNoKGFkZHJlc3NCb29rKTtcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkuY2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdE9DLk5vdGlmaWNhdGlvbi5zaG93VGVtcG9yYXJ5KHQoJ2NvbnRhY3RzJywgJ0FkZHJlc3MgYm9vayBjb3VsZCBub3QgYmUgY3JlYXRlZC4nKSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdhZGRyZXNzYm9va2xpc3QnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0VBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2FkZHJlc3Nib29rbGlzdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9hZGRyZXNzQm9va0xpc3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignYXZhdGFyQ3RybCcsIGZ1bmN0aW9uKENvbnRhY3RTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLmltcG9ydCA9IENvbnRhY3RTZXJ2aWNlLmltcG9ydC5iaW5kKENvbnRhY3RTZXJ2aWNlKTtcblxuXHRjdHJsLnJlbW92ZVBob3RvID0gZnVuY3Rpb24oKSB7XG5cdFx0Y3RybC5jb250YWN0LnJlbW92ZVByb3BlcnR5KCdwaG90bycsIGN0cmwuY29udGFjdC5nZXRQcm9wZXJ0eSgncGhvdG8nKSk7XG5cdFx0Q29udGFjdFNlcnZpY2UudXBkYXRlKGN0cmwuY29udGFjdCk7XG5cdFx0JCgnYXZhdGFyJykucmVtb3ZlQ2xhc3MoJ21heGltaXplZCcpO1xuXHR9O1xuXG5cdGN0cmwuZG93bmxvYWRQaG90byA9IGZ1bmN0aW9uKCkge1xuXHRcdC8qIGdsb2JhbHMgQXJyYXlCdWZmZXIsIFVpbnQ4QXJyYXkgKi9cblx0XHR2YXIgaW1nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRhY3QtYXZhdGFyJyk7XG5cdFx0Ly8gYXRvYiB0byBiYXNlNjRfZGVjb2RlIHRoZSBkYXRhLVVSSVxuXHRcdHZhciBpbWFnZVNwbGl0ID0gaW1nLnNyYy5zcGxpdCgnLCcpO1xuXHRcdC8vIFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0XCIgLT4gXCJwbmdcIlxuXHRcdHZhciBleHRlbnNpb24gPSAnLicgKyBpbWFnZVNwbGl0WzBdLnNwbGl0KCc7JylbMF0uc3BsaXQoJy8nKVsxXTtcblx0XHR2YXIgaW1hZ2VEYXRhID0gYXRvYihpbWFnZVNwbGl0WzFdKTtcblx0XHQvLyBVc2UgdHlwZWQgYXJyYXlzIHRvIGNvbnZlcnQgdGhlIGJpbmFyeSBkYXRhIHRvIGEgQmxvYlxuXHRcdHZhciBhcnJheUJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihpbWFnZURhdGEubGVuZ3RoKTtcblx0XHR2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKTtcblx0XHRmb3IgKHZhciBpPTA7IGk8aW1hZ2VEYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2aWV3W2ldID0gaW1hZ2VEYXRhLmNoYXJDb2RlQXQoaSkgJiAweGZmO1xuXHRcdH1cblx0XHR2YXIgYmxvYiA9IG5ldyBCbG9iKFthcnJheUJ1ZmZlcl0sIHt0eXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ30pO1xuXG5cdFx0Ly8gVXNlIHRoZSBVUkwgb2JqZWN0IHRvIGNyZWF0ZSBhIHRlbXBvcmFyeSBVUkxcblx0XHR2YXIgdXJsID0gKHdpbmRvdy53ZWJraXRVUkwgfHwgd2luZG93LlVSTCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG5cdFx0dmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcblx0XHRhLnN0eWxlID0gJ2Rpc3BsYXk6IG5vbmUnO1xuXHRcdGEuaHJlZiA9IHVybDtcblx0XHRhLmRvd25sb2FkID0gY3RybC5jb250YWN0LnVpZCgpICsgZXh0ZW5zaW9uO1xuXHRcdGEuY2xpY2soKTtcblx0XHR3aW5kb3cuVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuXHRcdGEucmVtb3ZlKCk7XG5cdH07XG5cblx0Y3RybC5vcGVuUGhvdG8gPSBmdW5jdGlvbigpIHtcblx0XHQkKCdhdmF0YXInKS50b2dnbGVDbGFzcygnbWF4aW1pemVkJyk7XG5cdH07XG5cblx0Y3RybC50ID0ge1xuXHRcdHVwbG9hZE5ld1Bob3RvIDogdCgnY29udGFjdHMnLCAnVXBsb2FkIG5ldyBpbWFnZScpLFxuXHRcdGRlbGV0ZVBob3RvIDogdCgnY29udGFjdHMnLCAnRGVsZXRlJyksXG5cdFx0Y2xvc2VQaG90byA6IHQoJ2NvbnRhY3RzJywgJ0Nsb3NlJyksXG5cdFx0ZG93bmxvYWRQaG90byA6IHQoJ2NvbnRhY3RzJywgJ0Rvd25sb2FkJylcblx0fTtcblxuXHQvLyBRdWl0IGF2YXRhciBwcmV2aWV3XG5cdCQoJ2F2YXRhcicpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdCQoJ2F2YXRhcicpLnJlbW92ZUNsYXNzKCdtYXhpbWl6ZWQnKTtcblx0fSk7XG5cdCQoJ2F2YXRhciBpbWcsIGF2YXRhciAuYXZhdGFyLW9wdGlvbnMnKS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSk7XG5cdCQoZG9jdW1lbnQpLmtleXVwKGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoZS5rZXlDb2RlID09PSAyNykge1xuXHRcdFx0JCgnYXZhdGFyJykucmVtb3ZlQ2xhc3MoJ21heGltaXplZCcpO1xuXHRcdH1cblx0fSk7XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2F2YXRhcicsIGZ1bmN0aW9uKENvbnRhY3RTZXJ2aWNlKSB7XG5cdHJldHVybiB7XG5cdFx0c2NvcGU6IHtcblx0XHRcdGNvbnRhY3Q6ICc9ZGF0YSdcblx0XHR9LFxuXHRcdGNvbnRyb2xsZXI6ICdhdmF0YXJDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRjb250YWN0OiAnPWRhdGEnXG5cdFx0fSxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuXHRcdFx0dmFyIGlucHV0ID0gZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuXHRcdFx0aW5wdXQuYmluZCgnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBmaWxlID0gaW5wdXQuZ2V0KDApLmZpbGVzWzBdO1xuXHRcdFx0XHRpZiAoZmlsZS5zaXplID4gMTAyNCoxMDI0KSB7IC8vIDEgTUJcblx0XHRcdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdUaGUgc2VsZWN0ZWQgaW1hZ2UgaXMgdG9vIGJpZyAobWF4IDFNQiknKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cblx0XHRcdFx0XHRyZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUuY29udGFjdC5waG90byhyZWFkZXIucmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UudXBkYXRlKHNjb3BlLmNvbnRhY3QpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSwgZmFsc2UpO1xuXG5cdFx0XHRcdFx0aWYgKGZpbGUpIHtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvYXZhdGFyLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RDdHJsJywgZnVuY3Rpb24oJHJvdXRlLCAkcm91dGVQYXJhbXMsIFNvcnRCeVNlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwudCA9IHtcblx0XHRlcnJvck1lc3NhZ2UgOiB0KCdjb250YWN0cycsICdUaGlzIGNhcmQgaXMgY29ycnVwdGVkIGFuZCBoYXMgYmVlbiBmaXhlZC4gUGxlYXNlIGNoZWNrIHRoZSBkYXRhIGFuZCB0cmlnZ2VyIGEgc2F2ZSB0byBtYWtlIHRoZSBjaGFuZ2VzIHBlcm1hbmVudC4nKSxcblx0fTtcblxuXHRjdHJsLmdldE5hbWUgPSBmdW5jdGlvbigpIHtcblx0XHQvLyBJZiBsYXN0TmFtZSBlcXVhbHMgdG8gZmlyc3ROYW1lIHRoZW4gbm9uZSBvZiB0aGVtIGlzIHNldFxuXHRcdGlmIChjdHJsLmNvbnRhY3QubGFzdE5hbWUoKSA9PT0gY3RybC5jb250YWN0LmZpcnN0TmFtZSgpKSB7XG5cdFx0XHRyZXR1cm4gY3RybC5jb250YWN0LmRpc3BsYXlOYW1lKCk7XG5cdFx0fVxuXG5cdFx0aWYgKFNvcnRCeVNlcnZpY2UuZ2V0U29ydEJ5S2V5KCkgPT09ICdzb3J0TGFzdE5hbWUnKSB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRjdHJsLmNvbnRhY3QubGFzdE5hbWUoKVxuXHRcdFx0XHQrIChjdHJsLmNvbnRhY3QuZmlyc3ROYW1lKCkgPyAnLCAnIDogJycpXG5cdFx0XHRcdCsgY3RybC5jb250YWN0LmZpcnN0TmFtZSgpICsgJyAnXG5cdFx0XHRcdCsgY3RybC5jb250YWN0LmFkZGl0aW9uYWxOYW1lcygpXG5cdFx0XHQpLnRyaW0oKTtcblx0XHR9XG5cblx0XHRpZiAoU29ydEJ5U2VydmljZS5nZXRTb3J0QnlLZXkoKSA9PT0gJ3NvcnRGaXJzdE5hbWUnKSB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRjdHJsLmNvbnRhY3QuZmlyc3ROYW1lKCkgKyAnICdcblx0XHRcdFx0KyBjdHJsLmNvbnRhY3QuYWRkaXRpb25hbE5hbWVzKCkgKyAnICdcblx0XHRcdFx0KyBjdHJsLmNvbnRhY3QubGFzdE5hbWUoKVxuXHRcdFx0KS50cmltKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGN0cmwuY29udGFjdC5kaXNwbGF5TmFtZSgpO1xuXHR9O1xufSk7XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdjb250YWN0JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdjb250YWN0Q3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge1xuXHRcdFx0Y29udGFjdDogJz1kYXRhJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2NvbnRhY3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignY29udGFjdGRldGFpbHNDdHJsJywgZnVuY3Rpb24oQ29udGFjdFNlcnZpY2UsIEFkZHJlc3NCb29rU2VydmljZSwgdkNhcmRQcm9wZXJ0aWVzU2VydmljZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICRzY29wZSkge1xuXG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLmluaXQgPSB0cnVlO1xuXHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0Y3RybC5zaG93ID0gZmFsc2U7XG5cblx0Y3RybC5jbGVhckNvbnRhY3QgPSBmdW5jdGlvbigpIHtcblx0XHQkcm91dGUudXBkYXRlUGFyYW1zKHtcblx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdHVpZDogdW5kZWZpbmVkXG5cdFx0fSk7XG5cdFx0Y3RybC5zaG93ID0gZmFsc2U7XG5cdFx0Y3RybC5jb250YWN0ID0gdW5kZWZpbmVkO1xuXHR9O1xuXG5cdGN0cmwudWlkID0gJHJvdXRlUGFyYW1zLnVpZDtcblx0Y3RybC50ID0ge1xuXHRcdG5vQ29udGFjdHMgOiB0KCdjb250YWN0cycsICdObyBjb250YWN0cyBpbiBoZXJlJyksXG5cdFx0cGxhY2Vob2xkZXJOYW1lIDogdCgnY29udGFjdHMnLCAnTmFtZScpLFxuXHRcdHBsYWNlaG9sZGVyT3JnIDogdCgnY29udGFjdHMnLCAnT3JnYW5pemF0aW9uJyksXG5cdFx0cGxhY2Vob2xkZXJUaXRsZSA6IHQoJ2NvbnRhY3RzJywgJ1RpdGxlJyksXG5cdFx0c2VsZWN0RmllbGQgOiB0KCdjb250YWN0cycsICdBZGQgZmllbGQg4oCmJyksXG5cdFx0ZG93bmxvYWQgOiB0KCdjb250YWN0cycsICdEb3dubG9hZCcpLFxuXHRcdGRlbGV0ZSA6IHQoJ2NvbnRhY3RzJywgJ0RlbGV0ZScpLFxuXHRcdHNhdmUgOiB0KCdjb250YWN0cycsICdTYXZlIGNoYW5nZXMnKSxcblx0XHRhZGRyZXNzQm9vayA6IHQoJ2NvbnRhY3RzJywgJ0FkZHJlc3MgYm9vaycpLFxuXHRcdGxvYWRpbmcgOiB0KCdjb250YWN0cycsICdMb2FkaW5nIGNvbnRhY3RzIOKApicpXG5cdH07XG5cblx0Y3RybC5maWVsZERlZmluaXRpb25zID0gdkNhcmRQcm9wZXJ0aWVzU2VydmljZS5maWVsZERlZmluaXRpb25zO1xuXHRjdHJsLmZvY3VzID0gdW5kZWZpbmVkO1xuXHRjdHJsLmZpZWxkID0gdW5kZWZpbmVkO1xuXHRjdHJsLmFkZHJlc3NCb29rcyA9IFtdO1xuXG5cdEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdGN0cmwuYWRkcmVzc0Jvb2tzID0gYWRkcmVzc0Jvb2tzO1xuXG5cdFx0aWYgKCFhbmd1bGFyLmlzVW5kZWZpbmVkKGN0cmwuY29udGFjdCkpIHtcblx0XHRcdGN0cmwuYWRkcmVzc0Jvb2sgPSBfLmZpbmQoY3RybC5hZGRyZXNzQm9va3MsIGZ1bmN0aW9uKGJvb2spIHtcblx0XHRcdFx0cmV0dXJuIGJvb2suZGlzcGxheU5hbWUgPT09IGN0cmwuY29udGFjdC5hZGRyZXNzQm9va0lkO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGN0cmwuaW5pdCA9IGZhbHNlO1xuXHRcdC8vIFN0YXJ0IHdhdGNoaW5nIGZvciBjdHJsLnVpZCB3aGVuIHdlIGhhdmUgYWRkcmVzc0Jvb2tzLCBhcyB0aGV5IGFyZSBuZWVkZWQgZm9yIGZldGNoaW5nXG5cdFx0Ly8gZnVsbCBkZXRhaWxzLlxuXHRcdCRzY29wZS4kd2F0Y2goJ2N0cmwudWlkJywgZnVuY3Rpb24obmV3VmFsdWUpIHtcblx0XHRcdGN0cmwuY2hhbmdlQ29udGFjdChuZXdWYWx1ZSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cblx0Y3RybC5jaGFuZ2VDb250YWN0ID0gZnVuY3Rpb24odWlkKSB7XG5cdFx0aWYgKHR5cGVvZiB1aWQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRjdHJsLnNob3cgPSBmYWxzZTtcblx0XHRcdCQoJyNhcHAtbmF2aWdhdGlvbi10b2dnbGUnKS5yZW1vdmVDbGFzcygnc2hvd2RldGFpbHMnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcblx0XHRDb250YWN0U2VydmljZS5nZXRCeUlkKGN0cmwuYWRkcmVzc0Jvb2tzLCB1aWQpLnRoZW4oZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0aWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoY29udGFjdCkpIHtcblx0XHRcdFx0Y3RybC5jbGVhckNvbnRhY3QoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y3RybC5jb250YWN0ID0gY29udGFjdDtcblx0XHRcdGN0cmwuc2hvdyA9IHRydWU7XG5cdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdCQoJyNhcHAtbmF2aWdhdGlvbi10b2dnbGUnKS5hZGRDbGFzcygnc2hvd2RldGFpbHMnKTtcblxuXHRcdFx0Y3RybC5hZGRyZXNzQm9vayA9IF8uZmluZChjdHJsLmFkZHJlc3NCb29rcywgZnVuY3Rpb24oYm9vaykge1xuXHRcdFx0XHRyZXR1cm4gYm9vay5kaXNwbGF5TmFtZSA9PT0gY3RybC5jb250YWN0LmFkZHJlc3NCb29rSWQ7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLmRlbGV0ZUNvbnRhY3QgPSBmdW5jdGlvbigpIHtcblx0XHRDb250YWN0U2VydmljZS5kZWxldGUoY3RybC5hZGRyZXNzQm9vaywgY3RybC5jb250YWN0KTtcblx0XHRjdHJsLnNlbGVjdE5lYXJlc3RDb250YWN0KGV2LnVpZCk7XG5cdH07XG5cblx0Y3RybC5hZGRGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG5cdFx0dmFyIGRlZmF1bHRWYWx1ZSA9IHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZ2V0TWV0YShmaWVsZCkuZGVmYXVsdFZhbHVlIHx8IHt2YWx1ZTogJyd9O1xuXHRcdGN0cmwuY29udGFjdC5hZGRQcm9wZXJ0eShmaWVsZCwgZGVmYXVsdFZhbHVlKTtcblx0XHRjdHJsLmZvY3VzID0gZmllbGQ7XG5cdFx0Y3RybC5maWVsZCA9ICcnO1xuXHR9O1xuXG5cdGN0cmwuZGVsZXRlRmllbGQgPSBmdW5jdGlvbiAoZmllbGQsIHByb3ApIHtcblx0XHRjdHJsLmNvbnRhY3QucmVtb3ZlUHJvcGVydHkoZmllbGQsIHByb3ApO1xuXHRcdGN0cmwuZm9jdXMgPSB1bmRlZmluZWQ7XG5cdH07XG5cblx0Y3RybC5jaGFuZ2VBZGRyZXNzQm9vayA9IGZ1bmN0aW9uIChhZGRyZXNzQm9vaywgb2xkQWRkcmVzc0Jvb2spIHtcblx0XHRDb250YWN0U2VydmljZS5tb3ZlQ29udGFjdChjdHJsLmNvbnRhY3QsIGFkZHJlc3NCb29rLCBvbGRBZGRyZXNzQm9vayk7XG5cdH07XG5cblx0Y3RybC51cGRhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcblxuXHRjdHJsLmNsb3NlTWVudXMgPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLm9wZW5lZE1lbnUgPSBmYWxzZTtcblx0fTtcblxuXHRjdHJsLm9wZW5NZW51ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRjdHJsLmNsb3NlTWVudXMoKTtcblx0XHRjdHJsLm9wZW5lZE1lbnUgPSBpbmRleDtcblx0fTtcblxuXHRjdHJsLnRvZ2dsZU1lbnUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdGlmIChjdHJsLm9wZW5lZE1lbnUgPT09IGluZGV4KSB7XG5cdFx0XHRjdHJsLmNsb3NlTWVudXMoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3RybC5vcGVuTWVudShpbmRleCk7XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnY29udGFjdGRldGFpbHMnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRwcmlvcml0eTogMSxcblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RkZXRhaWxzQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2NvbnRhY3REZXRhaWxzLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RmaWx0ZXJDdHJsJywgZnVuY3Rpb24oKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuXHR2YXIgY3RybCA9IHRoaXM7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdjb250YWN0RmlsdGVyJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RmaWx0ZXJDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRjb250YWN0RmlsdGVyOiAnPWNvbnRhY3RGaWx0ZXInXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdEZpbHRlci5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdjb250YWN0aW1wb3J0Q3RybCcsIGZ1bmN0aW9uKENvbnRhY3RTZXJ2aWNlLCBBZGRyZXNzQm9va1NlcnZpY2UsICR0aW1lb3V0LCAkc2NvcGUpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwudCA9IHtcblx0XHRpbXBvcnRUZXh0IDogdCgnY29udGFjdHMnLCAnSW1wb3J0IGludG8nKSxcblx0XHRpbXBvcnRpbmdUZXh0IDogdCgnY29udGFjdHMnLCAnSW1wb3J0aW5nLi4uJyksXG5cdFx0c2VsZWN0QWRkcmVzc2Jvb2sgOiB0KCdjb250YWN0cycsICdTZWxlY3QgeW91ciBhZGRyZXNzYm9vaycpLFxuXHRcdGltcG9ydGRpc2FibGVkIDogdCgnY29udGFjdHMnLCAnSW1wb3J0IGlzIGRpc2FibGVkIGJlY2F1c2Ugbm8gd3JpdGFibGUgYWRkcmVzcyBib29rIGhhZCBiZWVuIGZvdW5kLicpXG5cdH07XG5cblx0Y3RybC5pbXBvcnQgPSBDb250YWN0U2VydmljZS5pbXBvcnQuYmluZChDb250YWN0U2VydmljZSk7XG5cdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdGN0cmwuaW1wb3J0VGV4dCA9IGN0cmwudC5pbXBvcnRUZXh0O1xuXHRjdHJsLmltcG9ydGluZyA9IGZhbHNlO1xuXHRjdHJsLmxvYWRpbmdDbGFzcyA9ICdpY29uLXVwbG9hZCc7XG5cblx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2tzKSB7XG5cdFx0Y3RybC5hZGRyZXNzQm9va3MgPSBhZGRyZXNzQm9va3M7XG5cdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XG5cdFx0Y3RybC5zZWxlY3RlZEFkZHJlc3NCb29rID0gQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vaygpO1xuXHR9KTtcblxuXHRBZGRyZXNzQm9va1NlcnZpY2UucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrKGZ1bmN0aW9uKCkge1xuXHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0Y3RybC5zZWxlY3RlZEFkZHJlc3NCb29rID0gQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vaygpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdGN0cmwuc3RvcEhpZGVNZW51ID0gZnVuY3Rpb24oaXNPcGVuKSB7XG5cdFx0aWYoaXNPcGVuKSB7XG5cdFx0XHQvLyBkaXNhYmxpbmcgc2V0dGluZ3MgYmluZFxuXHRcdFx0JCgnI2FwcC1zZXR0aW5ncy1oZWFkZXIgPiBidXR0b24nKS5kYXRhKCdhcHBzLXNsaWRlLXRvZ2dsZScsIGZhbHNlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcmVlbmFibGluZyBpdFxuXHRcdFx0JCgnI2FwcC1zZXR0aW5ncy1oZWFkZXIgPiBidXR0b24nKS5kYXRhKCdhcHBzLXNsaWRlLXRvZ2dsZScsICcjYXBwLXNldHRpbmdzLWNvbnRlbnQnKTtcblx0XHR9XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2NvbnRhY3RpbXBvcnQnLCBmdW5jdGlvbihDb250YWN0U2VydmljZSwgSW1wb3J0U2VydmljZSwgJHJvb3RTY29wZSkge1xuXHRyZXR1cm4ge1xuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuXHRcdFx0dmFyIGlucHV0ID0gZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuXHRcdFx0aW5wdXQuYmluZCgnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFuZ3VsYXIuZm9yRWFjaChpbnB1dC5nZXQoMCkuZmlsZXMsIGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuXHRcdFx0XHRcdHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0c2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0Ly8gSW5kaWNhdGUgdGhlIHVzZXIgd2Ugc3RhcnRlZCBzb21ldGhpbmdcblx0XHRcdFx0XHRcdFx0Y3RybC5pbXBvcnRUZXh0ID0gY3RybC50LmltcG9ydGluZ1RleHQ7XG5cdFx0XHRcdFx0XHRcdGN0cmwubG9hZGluZ0NsYXNzID0gJ2ljb24tbG9hZGluZy1zbWFsbCc7XG5cdFx0XHRcdFx0XHRcdGN0cmwuaW1wb3J0aW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0JHJvb3RTY29wZS5pbXBvcnRpbmcgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHRcdENvbnRhY3RTZXJ2aWNlLmltcG9ydC5jYWxsKENvbnRhY3RTZXJ2aWNlLCByZWFkZXIucmVzdWx0LCBmaWxlLnR5cGUsIGN0cmwuc2VsZWN0ZWRBZGRyZXNzQm9vaywgZnVuY3Rpb24gKHByb2dyZXNzLCB1c2VyKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHByb2dyZXNzID09PSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLmltcG9ydFRleHQgPSBjdHJsLnQuaW1wb3J0VGV4dDtcblx0XHRcdFx0XHRcdFx0XHRcdGN0cmwubG9hZGluZ0NsYXNzID0gJ2ljb24tdXBsb2FkJztcblx0XHRcdFx0XHRcdFx0XHRcdGN0cmwuaW1wb3J0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHQkcm9vdFNjb3BlLmltcG9ydGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRQZXJjZW50ID0gMDtcblx0XHRcdFx0XHRcdFx0XHRcdEltcG9ydFNlcnZpY2UuaW1wb3J0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHRJbXBvcnRTZXJ2aWNlLmltcG9ydGVkVXNlciA9ICcnO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5zZWxlY3RlZEFkZHJlc3NCb29rID0gJyc7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFVnbHkgaGFjaywgaGlkZSBzaWRlYmFyIG9uIGltcG9ydCAmIG1vYmlsZVxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gU2ltdWxhdGUgY2xpY2sgc2luY2Ugd2UgY2FuJ3QgZGlyZWN0bHkgYWNjZXNzIHNuYXBwZXJcblx0XHRcdFx0XHRcdFx0XHRcdGlmKCQod2luZG93KS53aWR0aCgpIDw9IDc2OCAmJiAkKCdib2R5JykuaGFzQ2xhc3MoJ3NuYXBqcy1sZWZ0JykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnI2FwcC1uYXZpZ2F0aW9uLXRvZ2dsZScpLmNsaWNrKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJ2JvZHknKS5yZW1vdmVDbGFzcygnc25hcGpzLWxlZnQnKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRQZXJjZW50ID0gcGFyc2VJbnQoTWF0aC5mbG9vcihwcm9ncmVzcyAqIDEwMCkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRpbmcgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRlZFVzZXIgPSB1c2VyO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5zZWxlY3RlZEFkZHJlc3NCb29rID0gY3RybC5zZWxlY3RlZEFkZHJlc3NCb29rLmRpc3BsYXlOYW1lO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRzY29wZS4kYXBwbHkoKTtcblxuXHRcdFx0XHRcdFx0XHRcdC8qIEJyb2FkY2FzdCBzZXJ2aWNlIHVwZGF0ZSAqL1xuXHRcdFx0XHRcdFx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgnaW1wb3J0aW5nJywgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSwgZmFsc2UpO1xuXG5cdFx0XHRcdFx0aWYgKGZpbGUpIHtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlucHV0LmdldCgwKS52YWx1ZSA9ICcnO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdEltcG9ydC5odG1sJyksXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RpbXBvcnRDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJ1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICR0aW1lb3V0LCBBZGRyZXNzQm9va1NlcnZpY2UsIENvbnRhY3RTZXJ2aWNlLCBTb3J0QnlTZXJ2aWNlLCB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLCBTZWFyY2hTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLnJvdXRlUGFyYW1zID0gJHJvdXRlUGFyYW1zO1xuXG5cdGN0cmwuZmlsdGVyZWRDb250YWN0cyA9IFtdOyAvLyB0aGUgZGlzcGxheWVkIGNvbnRhY3RzIGxpc3Rcblx0Y3RybC5zZWFyY2hUZXJtID0gJyc7XG5cdGN0cmwuc2hvdyA9IHRydWU7XG5cdGN0cmwuaW52YWxpZCA9IGZhbHNlO1xuXHRjdHJsLmxpbWl0VG8gPSAyNTtcblxuXHRjdHJsLnNvcnRCeSA9IFNvcnRCeVNlcnZpY2UuZ2V0U29ydEJ5KCk7XG5cblx0Y3RybC50ID0ge1xuXHRcdGVtcHR5U2VhcmNoIDogdCgnY29udGFjdHMnLCAnTm8gc2VhcmNoIHJlc3VsdCBmb3Ige3F1ZXJ5fScsIHtxdWVyeTogY3RybC5zZWFyY2hUZXJtfSlcblx0fTtcblxuXHRjdHJsLnJlc2V0TGltaXRUbyA9IGZ1bmN0aW9uICgpIHtcblx0XHRjdHJsLmxpbWl0VG8gPSAyNTtcblx0XHRjbGVhckludGVydmFsKGN0cmwuaW50ZXJ2YWxJZCk7XG5cdFx0Y3RybC5pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoXG5cdFx0XHRmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICghY3RybC5sb2FkaW5nICYmIGN0cmwuY29udGFjdExpc3QgJiYgY3RybC5jb250YWN0TGlzdC5sZW5ndGggPiBjdHJsLmxpbWl0VG8pIHtcblx0XHRcdFx0XHRjdHJsLmxpbWl0VG8gKz0gMjU7XG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAzMDApO1xuXHR9O1xuXG5cdCRzY29wZS5xdWVyeSA9IGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRyZXR1cm4gY29udGFjdC5tYXRjaGVzKFNlYXJjaFNlcnZpY2UuZ2V0U2VhcmNoVGVybSgpKTtcblx0fTtcblxuXHRTb3J0QnlTZXJ2aWNlLnN1YnNjcmliZShmdW5jdGlvbihuZXdWYWx1ZSkge1xuXHRcdGN0cmwuc29ydEJ5ID0gbmV3VmFsdWU7XG5cdH0pO1xuXG5cdFNlYXJjaFNlcnZpY2UucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrKGZ1bmN0aW9uKGV2KSB7XG5cdFx0aWYgKGV2LmV2ZW50ID09PSAnc3VibWl0U2VhcmNoJykge1xuXHRcdFx0dmFyIHVpZCA9ICFfLmlzRW1wdHkoY3RybC5maWx0ZXJlZENvbnRhY3RzKSA/IGN0cmwuZmlsdGVyZWRDb250YWN0c1swXS51aWQoKSA6IHVuZGVmaW5lZDtcblx0XHRcdGN0cmwuc2V0U2VsZWN0ZWRJZCh1aWQpO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH1cblx0XHRpZiAoZXYuZXZlbnQgPT09ICdjaGFuZ2VTZWFyY2gnKSB7XG5cdFx0XHRjdHJsLnJlc2V0TGltaXRUbygpO1xuXHRcdFx0Y3RybC5zZWFyY2hUZXJtID0gZXYuc2VhcmNoVGVybTtcblx0XHRcdGN0cmwudC5lbXB0eVNlYXJjaCA9IHQoJ2NvbnRhY3RzJyxcblx0XHRcdFx0XHRcdFx0XHQgICAnTm8gc2VhcmNoIHJlc3VsdCBmb3Ige3F1ZXJ5fScsXG5cdFx0XHRcdFx0XHRcdFx0ICAge3F1ZXJ5OiBjdHJsLnNlYXJjaFRlcm19XG5cdFx0XHRcdFx0XHRcdFx0ICApO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH1cblx0fSk7XG5cblx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcblxuXHRDb250YWN0U2VydmljZS5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2soZnVuY3Rpb24oZXYpIHtcblx0XHQvKiBhZnRlciBpbXBvcnQgYXQgZmlyc3QgcmVmcmVzaCB0aGUgY29udGFjdExpc3QgKi9cblx0XHRpZiAoZXYuZXZlbnQgPT09ICdpbXBvcnRlbmQnKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjdHJsLmNvbnRhY3RMaXN0ID0gZXYuY29udGFjdHM7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0LyogdXBkYXRlIHJvdXRlIHBhcmFtZXRlcnMgKi9cblx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHN3aXRjaChldi5ldmVudCkge1xuXHRcdFx0XHRjYXNlICdkZWxldGUnOlxuXHRcdFx0XHRcdGN0cmwuc2VsZWN0TmVhcmVzdENvbnRhY3QoZXYudWlkKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnY3JlYXRlJzpcblx0XHRcdFx0XHQkcm91dGUudXBkYXRlUGFyYW1zKHtcblx0XHRcdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0XHRcdHVpZDogZXYudWlkXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2ltcG9ydGVuZCc6XG5cdFx0XHRcdFx0LyogYWZ0ZXIgaW1wb3J0IHNlbGVjdCAnQWxsIGNvbnRhY3RzJyBncm91cCBhbmQgZmlyc3QgY29udGFjdCAqL1xuXHRcdFx0XHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0XHRcdFx0Z2lkOiB0KCdjb250YWN0cycsICdBbGwgY29udGFjdHMnKSxcblx0XHRcdFx0XHRcdHVpZDogY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCAhPT0gMCA/IGN0cmwuZmlsdGVyZWRDb250YWN0c1swXS51aWQoKSA6IHVuZGVmaW5lZFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Y2FzZSAnZ2V0RnVsbENvbnRhY3RzJyB8fCAndXBkYXRlJzpcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHQvLyB1bmtub3duIGV2ZW50IC0+IGxlYXZlIGNhbGxiYWNrIHdpdGhvdXQgYWN0aW9uXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN0cmwuY29udGFjdExpc3QgPSBldi5jb250YWN0cztcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRBZGRyZXNzQm9va1NlcnZpY2UucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrKGZ1bmN0aW9uKGV2KSB7XG5cdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzd2l0Y2ggKGV2LmV2ZW50KSB7XG5cdFx0XHRcdGNhc2UgJ2RlbGV0ZSc6XG5cdFx0XHRcdGNhc2UgJ2Rpc2FibGUnOlxuXHRcdFx0XHRcdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UucmVtb3ZlQ29udGFjdHNGcm9tQWRkcmVzc2Jvb2soZXYuYWRkcmVzc0Jvb2ssIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihjb250YWN0cykge1xuXHRcdFx0XHRcdFx0XHRjdHJsLmNvbnRhY3RMaXN0ID0gY29udGFjdHM7XG5cdFx0XHRcdFx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHQvLyBPbmx5IGNoYW5nZSBjb250YWN0IGlmIHRoZSBzZWxlY3RkIG9uZSBpcyBub3QgaW4gdGhlIGxpc3QgYW55bW9yZVxuXHRcdFx0XHRcdFx0XHRpZihjdHJsLmNvbnRhY3RMaXN0LmZpbmRJbmRleChmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbnRhY3QudWlkKCkgPT09IGN0cmwuZ2V0U2VsZWN0ZWRJZCgpO1xuXHRcdFx0XHRcdFx0XHR9KSA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnNlbGVjdE5lYXJlc3RDb250YWN0KGN0cmwuZ2V0U2VsZWN0ZWRJZCgpKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2VuYWJsZSc6XG5cdFx0XHRcdFx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRDb250YWN0U2VydmljZS5hcHBlbmRDb250YWN0c0Zyb21BZGRyZXNzYm9vayhldi5hZGRyZXNzQm9vaywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRDb250YWN0U2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG5cdFx0XHRcdFx0XHRcdGN0cmwuY29udGFjdExpc3QgPSBjb250YWN0cztcblx0XHRcdFx0XHRcdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdC8vIHVua25vd24gZXZlbnQgLT4gbGVhdmUgY2FsbGJhY2sgd2l0aG91dCBhY3Rpb25cblx0XHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIEdldCBjb250YWN0c1xuXHRDb250YWN0U2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG5cdFx0aWYoY29udGFjdHMubGVuZ3RoPjApIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN0cmwuY29udGFjdExpc3QgPSBjb250YWN0cztcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdHZhciBnZXRWaXNpYmxlQ29udGFjdHMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2Nyb2xsZWQgPSAkKCcuYXBwLWNvbnRlbnQtbGlzdCcpLnNjcm9sbFRvcCgpO1xuXHRcdHZhciBlbEhlaWdodCA9ICQoJy5jb250YWN0cy1saXN0JykuY2hpbGRyZW4oKS5vdXRlckhlaWdodCh0cnVlKTtcblx0XHR2YXIgbGlzdEhlaWdodCA9ICQoJy5hcHAtY29udGVudC1saXN0JykuaGVpZ2h0KCk7XG5cblx0XHR2YXIgdG9wQ29udGFjdCA9IE1hdGgucm91bmQoc2Nyb2xsZWQvZWxIZWlnaHQpO1xuXHRcdHZhciBjb250YWN0c0NvdW50ID0gTWF0aC5yb3VuZChsaXN0SGVpZ2h0L2VsSGVpZ2h0KTtcblxuXHRcdHJldHVybiBjdHJsLmZpbHRlcmVkQ29udGFjdHMuc2xpY2UodG9wQ29udGFjdC0xLCB0b3BDb250YWN0K2NvbnRhY3RzQ291bnQrMSk7XG5cdH07XG5cblx0dmFyIHRpbWVvdXRJZCA9IG51bGw7XG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcHAtY29udGVudC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZnVuY3Rpb24gKCkge1xuXHRcdGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXHRcdHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIGNvbnRhY3RzID0gZ2V0VmlzaWJsZUNvbnRhY3RzKCk7XG5cdFx0XHRDb250YWN0U2VydmljZS5nZXRGdWxsQ29udGFjdHMoY29udGFjdHMpO1xuXHRcdH0sIDI1MCk7XG5cdH0pO1xuXG5cdC8vIFdhaXQgZm9yIGN0cmwuZmlsdGVyZWRDb250YWN0cyB0byBiZSB1cGRhdGVkLCBsb2FkIHRoZSBjb250YWN0IHJlcXVlc3RlZCBpbiB0aGUgVVJMIGlmIGFueSwgYW5kXG5cdC8vIGxvYWQgZnVsbCBkZXRhaWxzIGZvciB0aGUgcHJvYmFibHkgaW5pdGlhbGx5IHZpc2libGUgY29udGFjdHMuXG5cdC8vIFRoZW4ga2lsbCB0aGUgd2F0Y2guXG5cdHZhciB1bmJpbmRMaXN0V2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdjdHJsLmZpbHRlcmVkQ29udGFjdHMnLCBmdW5jdGlvbigpIHtcblx0XHRpZihjdHJsLmZpbHRlcmVkQ29udGFjdHMgJiYgY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCA+IDApIHtcblx0XHRcdC8vIENoZWNrIGlmIGEgc3BlY2lmaWMgdWlkIGlzIHJlcXVlc3RlZFxuXHRcdFx0aWYoJHJvdXRlUGFyYW1zLnVpZCAmJiAkcm91dGVQYXJhbXMuZ2lkKSB7XG5cdFx0XHRcdGN0cmwuZmlsdGVyZWRDb250YWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRcdFx0XHRpZihjb250YWN0LnVpZCgpID09PSAkcm91dGVQYXJhbXMudWlkKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldFNlbGVjdGVkSWQoJHJvdXRlUGFyYW1zLnVpZCk7XG5cdFx0XHRcdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gTm8gY29udGFjdCBwcmV2aW91c2x5IGxvYWRlZCwgbGV0J3MgbG9hZCB0aGUgZmlyc3Qgb2YgdGhlIGxpc3QgaWYgbm90IGluIG1vYmlsZSBtb2RlXG5cdFx0XHRpZihjdHJsLmxvYWRpbmcgJiYgJCh3aW5kb3cpLndpZHRoKCkgPiA3NjgpIHtcblx0XHRcdFx0Y3RybC5zZXRTZWxlY3RlZElkKGN0cmwuZmlsdGVyZWRDb250YWN0c1swXS51aWQoKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBHZXQgZnVsbCBkYXRhIGZvciB0aGUgZmlyc3QgMjAgY29udGFjdHMgb2YgdGhlIGxpc3Rcblx0XHRcdENvbnRhY3RTZXJ2aWNlLmdldEZ1bGxDb250YWN0cyhjdHJsLmZpbHRlcmVkQ29udGFjdHMuc2xpY2UoMCwgMjApKTtcblx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0dW5iaW5kTGlzdFdhdGNoKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkc2NvcGUuJHdhdGNoKCdjdHJsLnJvdXRlUGFyYW1zLnVpZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuXHRcdC8vIFVzZWQgZm9yIG1vYmlsZSB2aWV3IHRvIGNsZWFyIHRoZSB1cmxcblx0XHRpZih0eXBlb2Ygb2xkVmFsdWUgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIG5ld1ZhbHVlID09ICd1bmRlZmluZWQnICYmICQod2luZG93KS53aWR0aCgpIDw9IDc2OCkge1xuXHRcdFx0Ly8gbm8gY29udGFjdCBzZWxlY3RlZFxuXHRcdFx0Y3RybC5zaG93ID0gdHJ1ZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYobmV3VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0Ly8gd2UgbWlnaHQgaGF2ZSB0byB3YWl0IHVudGlsIG5nLXJlcGVhdCBmaWxsZWQgdGhlIGNvbnRhY3RMaXN0XG5cdFx0XHRpZihjdHJsLmZpbHRlcmVkQ29udGFjdHMgJiYgY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0Z2lkOiAkcm91dGVQYXJhbXMuZ2lkLFxuXHRcdFx0XHRcdHVpZDogY3RybC5maWx0ZXJlZENvbnRhY3RzWzBdLnVpZCgpXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gd2F0Y2ggZm9yIG5leHQgY29udGFjdExpc3QgdXBkYXRlXG5cdFx0XHRcdHZhciB1bmJpbmRXYXRjaCA9ICRzY29wZS4kd2F0Y2goJ2N0cmwuZmlsdGVyZWRDb250YWN0cycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmKGN0cmwuZmlsdGVyZWRDb250YWN0cyAmJiBjdHJsLmZpbHRlcmVkQ29udGFjdHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0XHRcdFx0dWlkOiBjdHJsLmZpbHRlcmVkQ29udGFjdHNbMF0udWlkKClcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR1bmJpbmRXYXRjaCgpOyAvLyB1bmJpbmQgYXMgd2Ugb25seSB3YW50IG9uZSB1cGRhdGVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGRpc3BsYXlpbmcgY29udGFjdCBkZXRhaWxzXG5cdFx0XHRjdHJsLnNob3cgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCRzY29wZS4kd2F0Y2goJ2N0cmwucm91dGVQYXJhbXMuZ2lkJywgZnVuY3Rpb24oKSB7XG5cdFx0Ly8gd2UgbWlnaHQgaGF2ZSB0byB3YWl0IHVudGlsIG5nLXJlcGVhdCBmaWxsZWQgdGhlIGNvbnRhY3RMaXN0XG5cdFx0Y3RybC5maWx0ZXJlZENvbnRhY3RzID0gW107XG5cdFx0Y3RybC5yZXNldExpbWl0VG8oKTtcblx0XHQvLyBub3QgaW4gbW9iaWxlIG1vZGVcblx0XHRpZigkKHdpbmRvdykud2lkdGgoKSA+IDc2OCkge1xuXHRcdFx0Ly8gd2F0Y2ggZm9yIG5leHQgY29udGFjdExpc3QgdXBkYXRlXG5cdFx0XHR2YXIgdW5iaW5kV2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdjdHJsLmZpbHRlcmVkQ29udGFjdHMnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYoY3RybC5maWx0ZXJlZENvbnRhY3RzICYmIGN0cmwuZmlsdGVyZWRDb250YWN0cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHRcdFx0XHR1aWQ6ICRyb3V0ZVBhcmFtcy51aWQgfHwgY3RybC5maWx0ZXJlZENvbnRhY3RzWzBdLnVpZCgpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dW5iaW5kV2F0Y2goKTsgLy8gdW5iaW5kIGFzIHdlIG9ubHkgd2FudCBvbmUgdXBkYXRlXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFdhdGNoIGlmIHdlIGhhdmUgYW4gaW52YWxpZCBjb250YWN0XG5cdCRzY29wZS4kd2F0Y2goJ2N0cmwuZmlsdGVyZWRDb250YWN0c1swXS5kaXNwbGF5TmFtZSgpJywgZnVuY3Rpb24oZGlzcGxheU5hbWUpIHtcblx0XHRjdHJsLmludmFsaWQgPSAoZGlzcGxheU5hbWUgPT09ICcnKTtcblx0fSk7XG5cblx0Y3RybC5oYXNDb250YWN0cyA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIWN0cmwuY29udGFjdExpc3QpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIGN0cmwuY29udGFjdExpc3QubGVuZ3RoID4gMDtcblx0fTtcblxuXHRjdHJsLnNldFNlbGVjdGVkSWQgPSBmdW5jdGlvbiAoY29udGFjdElkKSB7XG5cdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHR1aWQ6IGNvbnRhY3RJZFxuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwuZ2V0U2VsZWN0ZWRJZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkcm91dGVQYXJhbXMudWlkO1xuXHR9O1xuXG5cdGN0cmwuc2VsZWN0TmVhcmVzdENvbnRhY3QgPSBmdW5jdGlvbihjb250YWN0SWQpIHtcblx0XHRpZiAoY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0dWlkOiB1bmRlZmluZWRcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdC8vIEdldCBuZWFyZXN0IGNvbnRhY3Rcblx0XHRcdFx0aWYgKGN0cmwuZmlsdGVyZWRDb250YWN0c1tpXS51aWQoKSA9PT0gY29udGFjdElkKSB7XG5cdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHRcdFx0XHR1aWQ6IChjdHJsLmZpbHRlcmVkQ29udGFjdHNbaSsxXSkgPyBjdHJsLmZpbHRlcmVkQ29udGFjdHNbaSsxXS51aWQoKSA6IGN0cmwuZmlsdGVyZWRDb250YWN0c1tpLTFdLnVpZCgpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2NvbnRhY3RsaXN0JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cHJpb3JpdHk6IDEsXG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdjb250YWN0bGlzdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdGFkZHJlc3Nib29rOiAnPWFkcmJvb2snXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdExpc3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignZGV0YWlsc0l0ZW1DdHJsJywgZnVuY3Rpb24oJHRlbXBsYXRlUmVxdWVzdCwgJGZpbHRlciwgdkNhcmRQcm9wZXJ0aWVzU2VydmljZSwgQ29udGFjdFNlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwubWV0YSA9IHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZ2V0TWV0YShjdHJsLm5hbWUpO1xuXHRjdHJsLnR5cGUgPSB1bmRlZmluZWQ7XG5cdGN0cmwuaXNQcmVmZXJyZWQgPSBmYWxzZTtcblx0Y3RybC50ID0ge1xuXHRcdHBvQm94IDogdCgnY29udGFjdHMnLCAnUG9zdCBvZmZpY2UgYm94JyksXG5cdFx0cG9zdGFsQ29kZSA6IHQoJ2NvbnRhY3RzJywgJ1Bvc3RhbCBjb2RlJyksXG5cdFx0Y2l0eSA6IHQoJ2NvbnRhY3RzJywgJ0NpdHknKSxcblx0XHRzdGF0ZSA6IHQoJ2NvbnRhY3RzJywgJ1N0YXRlIG9yIHByb3ZpbmNlJyksXG5cdFx0Y291bnRyeSA6IHQoJ2NvbnRhY3RzJywgJ0NvdW50cnknKSxcblx0XHRhZGRyZXNzOiB0KCdjb250YWN0cycsICdBZGRyZXNzJyksXG5cdFx0bmV3R3JvdXA6IHQoJ2NvbnRhY3RzJywgJyhuZXcgZ3JvdXApJyksXG5cdFx0ZmFtaWx5TmFtZTogdCgnY29udGFjdHMnLCAnTGFzdCBuYW1lJyksXG5cdFx0Zmlyc3ROYW1lOiB0KCdjb250YWN0cycsICdGaXJzdCBuYW1lJyksXG5cdFx0YWRkaXRpb25hbE5hbWVzOiB0KCdjb250YWN0cycsICdBZGRpdGlvbmFsIG5hbWVzJyksXG5cdFx0aG9ub3JpZmljUHJlZml4OiB0KCdjb250YWN0cycsICdQcmVmaXgnKSxcblx0XHRob25vcmlmaWNTdWZmaXg6IHQoJ2NvbnRhY3RzJywgJ1N1ZmZpeCcpLFxuXHRcdGRlbGV0ZTogdCgnY29udGFjdHMnLCAnRGVsZXRlJylcblx0fTtcblxuXHRjdHJsLmF2YWlsYWJsZU9wdGlvbnMgPSBjdHJsLm1ldGEub3B0aW9ucyB8fCBbXTtcblx0aWYgKCFfLmlzVW5kZWZpbmVkKGN0cmwuZGF0YSkgJiYgIV8uaXNVbmRlZmluZWQoY3RybC5kYXRhLm1ldGEpICYmICFfLmlzVW5kZWZpbmVkKGN0cmwuZGF0YS5tZXRhLnR5cGUpKSB7XG5cdFx0Ly8gcGFyc2UgdHlwZSBvZiB0aGUgcHJvcGVydHlcblx0XHR2YXIgYXJyYXkgPSBjdHJsLmRhdGEubWV0YS50eXBlWzBdLnNwbGl0KCcsJyk7XG5cdFx0YXJyYXkgPSBhcnJheS5tYXAoZnVuY3Rpb24gKGVsZW0pIHtcblx0XHRcdHJldHVybiBlbGVtLnRyaW0oKS5yZXBsYWNlKC9cXC8rJC8sICcnKS5yZXBsYWNlKC9cXFxcKyQvLCAnJykudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdFx0Ly8gdGhlIHByZWYgdmFsdWUgaXMgaGFuZGxlZCBvbiBpdHMgb3duIHNvIHRoYXQgd2UgY2FuIGFkZCBzb21lIGZhdm9yaXRlIGljb24gdG8gdGhlIHVpIGlmIHdlIHdhbnRcblx0XHRpZiAoYXJyYXkuaW5kZXhPZignUFJFRicpID49IDApIHtcblx0XHRcdGN0cmwuaXNQcmVmZXJyZWQgPSB0cnVlO1xuXHRcdFx0YXJyYXkuc3BsaWNlKGFycmF5LmluZGV4T2YoJ1BSRUYnKSwgMSk7XG5cdFx0fVxuXHRcdC8vIHNpbXBseSBqb2luIHRoZSB1cHBlciBjYXNlZCB0eXBlcyB0b2dldGhlciBhcyBrZXlcblx0XHRjdHJsLnR5cGUgPSBhcnJheS5qb2luKCcsJyk7XG5cdFx0dmFyIGRpc3BsYXlOYW1lID0gYXJyYXkubWFwKGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0XHRyZXR1cm4gZWxlbWVudC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGVsZW1lbnQuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcblx0XHR9KS5qb2luKCcgJyk7XG5cdFx0Ly8gaW4gY2FzZSB0aGUgdHlwZSBpcyBub3QgeWV0IGluIHRoZSBkZWZhdWx0IGxpc3Qgb2YgYXZhaWxhYmxlIG9wdGlvbnMgd2UgYWRkIGl0XG5cdFx0aWYgKCFjdHJsLmF2YWlsYWJsZU9wdGlvbnMuc29tZShmdW5jdGlvbihlKSB7IHJldHVybiBlLmlkID09PSBjdHJsLnR5cGU7IH0gKSkge1xuXHRcdFx0Y3RybC5hdmFpbGFibGVPcHRpb25zID0gY3RybC5hdmFpbGFibGVPcHRpb25zLmNvbmNhdChbe2lkOiBjdHJsLnR5cGUsIG5hbWU6IGRpc3BsYXlOYW1lfV0pO1xuXHRcdH1cblxuXHRcdC8vIFJlbW92ZSBkdXBsaWNhdGUgZW50cnlcblx0XHRjdHJsLmF2YWlsYWJsZU9wdGlvbnMgPSBfLnVuaXEoY3RybC5hdmFpbGFibGVPcHRpb25zLCBmdW5jdGlvbihvcHRpb24pIHsgcmV0dXJuIG9wdGlvbi5uYW1lOyB9KTtcblx0XHRpZiAoY3RybC5hdmFpbGFibGVPcHRpb25zLmZpbHRlcihmdW5jdGlvbihvcHRpb24pIHsgcmV0dXJuIG9wdGlvbi5pZCA9PT0gY3RybC50eXBlOyB9KS5sZW5ndGggPT09IDApIHtcblx0XHRcdC8vIE91ciBkZWZhdWx0IHZhbHVlIGhhcyBiZWVuIHRocm93biBvdXQgYnkgdGhlIHVuaXEgZnVuY3Rpb24sIGxldCdzIGZpbmQgYSByZXBsYWNlbWVudFxuXHRcdFx0dmFyIG9wdGlvbk5hbWUgPSBjdHJsLm1ldGEub3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24ob3B0aW9uKSB7IHJldHVybiBvcHRpb24uaWQgPT09IGN0cmwudHlwZTsgfSlbMF0ubmFtZTtcblx0XHRcdGN0cmwudHlwZSA9IGN0cmwuYXZhaWxhYmxlT3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24ob3B0aW9uKSB7IHJldHVybiBvcHRpb24ubmFtZSA9PT0gb3B0aW9uTmFtZTsgfSlbMF0uaWQ7XG5cdFx0XHQvLyBXZSBkb24ndCB3YW50IHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IGtleXMuIENvbXBhdGliaWxpdHkgPiBzdGFuZGFyZGl6YXRpb25cblx0XHRcdC8vIGN0cmwuZGF0YS5tZXRhLnR5cGVbMF0gPSBjdHJsLnR5cGU7XG5cdFx0XHQvLyBjdHJsLm1vZGVsLnVwZGF0ZUNvbnRhY3QoKTtcblx0XHR9XG5cdH1cblx0aWYgKCFfLmlzVW5kZWZpbmVkKGN0cmwuZGF0YSkgJiYgIV8uaXNVbmRlZmluZWQoY3RybC5kYXRhLm5hbWVzcGFjZSkpIHtcblx0XHRpZiAoIV8uaXNVbmRlZmluZWQoY3RybC5jb250YWN0LnByb3BzWydYLUFCTEFCRUwnXSkpIHtcblx0XHRcdHZhciB2YWwgPSBfLmZpbmQodGhpcy5jb250YWN0LnByb3BzWydYLUFCTEFCRUwnXSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lc3BhY2UgPT09IGN0cmwuZGF0YS5uYW1lc3BhY2U7IH0pO1xuXHRcdFx0Y3RybC50eXBlID0gdmFsLnZhbHVlLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRpZiAoIV8uaXNVbmRlZmluZWQodmFsKSkge1xuXHRcdFx0XHQvLyBpbiBjYXNlIHRoZSB0eXBlIGlzIG5vdCB5ZXQgaW4gdGhlIGRlZmF1bHQgbGlzdCBvZiBhdmFpbGFibGUgb3B0aW9ucyB3ZSBhZGQgaXRcblx0XHRcdFx0aWYgKCFjdHJsLmF2YWlsYWJsZU9wdGlvbnMuc29tZShmdW5jdGlvbihlKSB7IHJldHVybiBlLmlkID09PSB2YWwudmFsdWU7IH0gKSkge1xuXHRcdFx0XHRcdGN0cmwuYXZhaWxhYmxlT3B0aW9ucyA9IGN0cmwuYXZhaWxhYmxlT3B0aW9ucy5jb25jYXQoW3tpZDogdmFsLnZhbHVlLnRvVXBwZXJDYXNlKCksIG5hbWU6IHZhbC52YWx1ZS50b1VwcGVyQ2FzZSgpfV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y3RybC5hdmFpbGFibGVHcm91cHMgPSBbXTtcblxuXHRDb250YWN0U2VydmljZS5nZXRHcm91cHMoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdGN0cmwuYXZhaWxhYmxlR3JvdXBzID0gXy51bmlxdWUoZ3JvdXBzKTtcblx0fSk7XG5cblx0Y3RybC5jaGFuZ2VUeXBlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRcdGlmIChjdHJsLmlzUHJlZmVycmVkKSB7XG5cdFx0XHR2YWwgKz0gJyxQUkVGJztcblx0XHR9XG5cdFx0Y3RybC5kYXRhLm1ldGEgPSBjdHJsLmRhdGEubWV0YSB8fCB7fTtcblx0XHRjdHJsLmRhdGEubWV0YS50eXBlID0gY3RybC5kYXRhLm1ldGEudHlwZSB8fCBbXTtcblx0XHRjdHJsLmRhdGEubWV0YS50eXBlWzBdID0gdmFsO1xuXHRcdENvbnRhY3RTZXJ2aWNlLnF1ZXVlVXBkYXRlKGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC5kYXRlSW5wdXRDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuXHRcdGN0cmwuZGF0YS5tZXRhID0gY3RybC5kYXRhLm1ldGEgfHwge307XG5cblx0XHR2YXIgbWF0Y2ggPSBjdHJsLmRhdGEudmFsdWUubWF0Y2goL14oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KSQvKTtcblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdGN0cmwuZGF0YS5tZXRhLnZhbHVlID0gW107XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN0cmwuZGF0YS5tZXRhLnZhbHVlID0gY3RybC5kYXRhLm1ldGEudmFsdWUgfHwgW107XG5cdFx0XHRjdHJsLmRhdGEubWV0YS52YWx1ZVswXSA9ICd0ZXh0Jztcblx0XHR9XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcblxuXHRjdHJsLnVwZGF0ZURldGFpbGVkTmFtZSA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZm4gPSAnJztcblx0XHRpZiAoY3RybC5kYXRhLnZhbHVlWzNdKSB7XG5cdFx0XHRmbiArPSBjdHJsLmRhdGEudmFsdWVbM10gKyAnICc7XG5cdFx0fVxuXHRcdGlmIChjdHJsLmRhdGEudmFsdWVbMV0pIHtcblx0XHRcdGZuICs9IGN0cmwuZGF0YS52YWx1ZVsxXSArICcgJztcblx0XHR9XG5cdFx0aWYgKGN0cmwuZGF0YS52YWx1ZVsyXSkge1xuXHRcdFx0Zm4gKz0gY3RybC5kYXRhLnZhbHVlWzJdICsgJyAnO1xuXHRcdH1cblx0XHRpZiAoY3RybC5kYXRhLnZhbHVlWzBdKSB7XG5cdFx0XHRmbiArPSBjdHJsLmRhdGEudmFsdWVbMF0gKyAnICc7XG5cdFx0fVxuXHRcdGlmIChjdHJsLmRhdGEudmFsdWVbNF0pIHtcblx0XHRcdGZuICs9IGN0cmwuZGF0YS52YWx1ZVs0XTtcblx0XHR9XG5cblx0XHRjdHJsLmNvbnRhY3QuZnVsbE5hbWUoZm4pO1xuXHRcdENvbnRhY3RTZXJ2aWNlLnF1ZXVlVXBkYXRlKGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC51cGRhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcblxuXHRjdHJsLmdldFRlbXBsYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRlbXBsYXRlVXJsID0gT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvZGV0YWlsSXRlbXMvJyArIGN0cmwubWV0YS50ZW1wbGF0ZSArICcuaHRtbCcpO1xuXHRcdHJldHVybiAkdGVtcGxhdGVSZXF1ZXN0KHRlbXBsYXRlVXJsKTtcblx0fTtcblxuXHRjdHJsLmRlbGV0ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xuXHRcdGN0cmwuY29udGFjdC5yZW1vdmVQcm9wZXJ0eShjdHJsLm5hbWUsIGN0cmwuZGF0YSk7XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2RldGFpbHNpdGVtJywgWyckY29tcGlsZScsIGZ1bmN0aW9uKCRjb21waWxlKSB7XG5cdHJldHVybiB7XG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdkZXRhaWxzSXRlbUN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdG5hbWU6ICc9Jyxcblx0XHRcdGRhdGE6ICc9Jyxcblx0XHRcdGNvbnRhY3Q6ICc9bW9kZWwnLFxuXHRcdFx0aW5kZXg6ICc9J1xuXHRcdH0sXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG5cdFx0XHRjdHJsLmdldFRlbXBsYXRlKCkudGhlbihmdW5jdGlvbihodG1sKSB7XG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9IGFuZ3VsYXIuZWxlbWVudChodG1sKTtcblx0XHRcdFx0ZWxlbWVudC5hcHBlbmQodGVtcGxhdGUpO1xuXHRcdFx0XHQkY29tcGlsZSh0ZW1wbGF0ZSkoc2NvcGUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufV0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdncm91cEN0cmwnLCBmdW5jdGlvbigpIHtcblx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzXG5cdHZhciBjdHJsID0gdGhpcztcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2dyb3VwJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2dyb3VwQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge1xuXHRcdFx0Z3JvdXA6ICc9Z3JvdXAnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvZ3JvdXAuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignZ3JvdXBsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHRpbWVvdXQsIENvbnRhY3RTZXJ2aWNlLCBTZWFyY2hTZXJ2aWNlLCAkcm91dGVQYXJhbXMpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwuZ3JvdXBzID0gW107XG5cdGN0cmwuY29udGFjdEZpbHRlcnMgPSBbXTtcblxuXHRDb250YWN0U2VydmljZS5nZXRHcm91cExpc3QoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdGN0cmwuZ3JvdXBzID0gZ3JvdXBzO1xuXHR9KTtcblxuXHRDb250YWN0U2VydmljZS5nZXRDb250YWN0RmlsdGVycygpLnRoZW4oZnVuY3Rpb24oY29udGFjdEZpbHRlcnMpIHtcblx0XHRjdHJsLmNvbnRhY3RGaWx0ZXJzID0gY29udGFjdEZpbHRlcnM7XG5cdH0pO1xuXG5cdGN0cmwuZ2V0U2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJHJvdXRlUGFyYW1zLmdpZDtcblx0fTtcblxuXHQvLyBVcGRhdGUgZ3JvdXBMaXN0IG9uIGNvbnRhY3QgYWRkL2RlbGV0ZS91cGRhdGUvZ3JvdXBzVXBkYXRlXG5cdENvbnRhY3RTZXJ2aWNlLnJlZ2lzdGVyT2JzZXJ2ZXJDYWxsYmFjayhmdW5jdGlvbihldikge1xuXHRcdGlmIChldi5ldmVudCAhPT0gJ2dldEZ1bGxDb250YWN0cycpIHtcblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRDb250YWN0U2VydmljZS5nZXRHcm91cExpc3QoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdFx0XHRcdFx0Y3RybC5ncm91cHMgPSBncm91cHM7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UuZ2V0Q29udGFjdEZpbHRlcnMoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRjdHJsLmNvbnRhY3RGaWx0ZXJzID0gY29udGFjdEZpbHRlcnM7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcblxuXHRjdHJsLnNldFNlbGVjdGVkID0gZnVuY3Rpb24gKHNlbGVjdGVkR3JvdXApIHtcblx0XHRTZWFyY2hTZXJ2aWNlLmNsZWFuU2VhcmNoKCk7XG5cdFx0JHJvdXRlUGFyYW1zLmdpZCA9IHNlbGVjdGVkR3JvdXA7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdncm91cGxpc3QnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0VBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2dyb3VwbGlzdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9ncm91cExpc3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignaW1wb3J0c2NyZWVuQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgSW1wb3J0U2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC50ID0ge1xuXHRcdGltcG9ydGluZ1RvIDogdCgnY29udGFjdHMnLCAnSW1wb3J0aW5nIGludG8nKSxcblx0XHRzZWxlY3RBZGRyZXNzYm9vayA6IHQoJ2NvbnRhY3RzJywgJ1NlbGVjdCB5b3VyIGFkZHJlc3Nib29rJylcblx0fTtcblxuXHQvLyBCcm9hZGNhc3QgdXBkYXRlXG5cdCRzY29wZS4kb24oJ2ltcG9ydGluZycsIGZ1bmN0aW9uICgpIHtcblx0XHRjdHJsLnNlbGVjdGVkQWRkcmVzc0Jvb2sgPSBJbXBvcnRTZXJ2aWNlLnNlbGVjdGVkQWRkcmVzc0Jvb2s7XG5cdFx0Y3RybC5pbXBvcnRlZFVzZXIgPSBJbXBvcnRTZXJ2aWNlLmltcG9ydGVkVXNlcjtcblx0XHRjdHJsLmltcG9ydGluZyA9IEltcG9ydFNlcnZpY2UuaW1wb3J0aW5nO1xuXHRcdGN0cmwuaW1wb3J0UGVyY2VudCA9IEltcG9ydFNlcnZpY2UuaW1wb3J0UGVyY2VudDtcblx0fSk7XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2ltcG9ydHNjcmVlbicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRUEnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnaW1wb3J0c2NyZWVuQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2ltcG9ydFNjcmVlbi5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCduZXdDb250YWN0QnV0dG9uQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQ29udGFjdFNlcnZpY2UsICRyb3V0ZVBhcmFtcywgdkNhcmRQcm9wZXJ0aWVzU2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC50ID0ge1xuXHRcdGFkZENvbnRhY3QgOiB0KCdjb250YWN0cycsICdOZXcgY29udGFjdCcpXG5cdH07XG5cblx0Y3RybC5jcmVhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UuY3JlYXRlKCkudGhlbihmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRbJ3RlbCcsICdhZHInLCAnZW1haWwnXS5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG5cdFx0XHRcdHZhciBkZWZhdWx0VmFsdWUgPSB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLmdldE1ldGEoZmllbGQpLmRlZmF1bHRWYWx1ZSB8fCB7dmFsdWU6ICcnfTtcblx0XHRcdFx0Y29udGFjdC5hZGRQcm9wZXJ0eShmaWVsZCwgZGVmYXVsdFZhbHVlKTtcblx0XHRcdH0gKTtcblx0XHRcdGlmIChbdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJyksIHQoJ2NvbnRhY3RzJywgJ05vdCBncm91cGVkJyldLmluZGV4T2YoJHJvdXRlUGFyYW1zLmdpZCkgPT09IC0xKSB7XG5cdFx0XHRcdGNvbnRhY3QuY2F0ZWdvcmllcyhbICRyb3V0ZVBhcmFtcy5naWQgXSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb250YWN0LmNhdGVnb3JpZXMoW10pO1xuXHRcdFx0fVxuXHRcdFx0JCgnI2RldGFpbHMtZnVsbE5hbWUnKS5mb2N1cygpO1xuXHRcdH0pO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnbmV3Y29udGFjdGJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRUEnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnbmV3Q29udGFjdEJ1dHRvbkN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9uZXdDb250YWN0QnV0dG9uLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgndGVsTW9kZWwnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJue1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRyLCBuZ01vZGVsKSB7XG5cdFx0XHRuZ01vZGVsLiRmb3JtYXR0ZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0XHRuZ01vZGVsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ3Byb3BlcnR5R3JvdXBDdHJsJywgZnVuY3Rpb24odkNhcmRQcm9wZXJ0aWVzU2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC5tZXRhID0gdkNhcmRQcm9wZXJ0aWVzU2VydmljZS5nZXRNZXRhKGN0cmwubmFtZSk7XG5cblx0dGhpcy5pc0hpZGRlbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBjdHJsLm1ldGEuaGFzT3duUHJvcGVydHkoJ2hpZGRlbicpICYmIGN0cmwubWV0YS5oaWRkZW4gPT09IHRydWU7XG5cdH07XG5cblx0dGhpcy5nZXRJY29uQ2xhc3MgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gY3RybC5tZXRhLmljb24gfHwgJ2ljb24tY29udGFjdHMtZGFyayc7XG5cdH07XG5cblx0dGhpcy5nZXRJbmZvQ2xhc3MgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoY3RybC5tZXRhLmhhc093blByb3BlcnR5KCdpbmZvJykpIHtcblx0XHRcdHJldHVybiAnaWNvbi1pbmZvJztcblxuXHRcdH1cblx0fTtcblxuXHR0aGlzLmdldEluZm9UZXh0ID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGN0cmwubWV0YS5pbmZvO1xuXHR9O1xuXG5cdHRoaXMuZ2V0UmVhZGFibGVOYW1lID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGN0cmwubWV0YS5yZWFkYWJsZU5hbWU7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdwcm9wZXJ0eWdyb3VwJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdwcm9wZXJ0eUdyb3VwQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge1xuXHRcdFx0cHJvcGVydGllczogJz1kYXRhJyxcblx0XHRcdG5hbWU6ICc9Jyxcblx0XHRcdGNvbnRhY3Q6ICc9bW9kZWwnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvcHJvcGVydHlHcm91cC5odG1sJyksXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG5cdFx0XHRpZihjdHJsLmlzSGlkZGVuKCkpIHtcblx0XHRcdFx0Ly8gVE9ETyByZXBsYWNlIHdpdGggY2xhc3Ncblx0XHRcdFx0ZWxlbWVudC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdzb3J0YnlDdHJsJywgZnVuY3Rpb24oU29ydEJ5U2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0dmFyIHNvcnRUZXh0ID0gdCgnY29udGFjdHMnLCAnU29ydCBieScpO1xuXHRjdHJsLnNvcnRUZXh0ID0gc29ydFRleHQ7XG5cblx0dmFyIHNvcnRMaXN0ID0gU29ydEJ5U2VydmljZS5nZXRTb3J0QnlMaXN0KCk7XG5cdGN0cmwuc29ydExpc3QgPSBzb3J0TGlzdDtcblxuXHRjdHJsLmRlZmF1bHRPcmRlciA9IFNvcnRCeVNlcnZpY2UuZ2V0U29ydEJ5S2V5KCk7XG5cblx0Y3RybC51cGRhdGVTb3J0QnkgPSBmdW5jdGlvbigpIHtcblx0XHRTb3J0QnlTZXJ2aWNlLnNldFNvcnRCeShjdHJsLmRlZmF1bHRPcmRlcik7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdzb3J0YnknLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRwcmlvcml0eTogMSxcblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ3NvcnRieUN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9zb3J0QnkuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmFjdG9yeSgnQWRkcmVzc0Jvb2snLCBmdW5jdGlvbigpXG57XG5cdHJldHVybiBmdW5jdGlvbiBBZGRyZXNzQm9vayhkYXRhKSB7XG5cdFx0YW5ndWxhci5leHRlbmQodGhpcywge1xuXG5cdFx0XHRkaXNwbGF5TmFtZTogJycsXG5cdFx0XHRjb250YWN0czogW10sXG5cdFx0XHRncm91cHM6IGRhdGEuZGF0YS5wcm9wcy5ncm91cHMsXG5cdFx0XHRyZWFkT25seTogZGF0YS5kYXRhLnByb3BzLnJlYWRPbmx5ID09PSAnMScsXG5cdFx0XHQvLyBJbiBjYXNlIG9mIG5vdCBkZWZpbmVkXG5cdFx0XHRlbmFibGVkOiBkYXRhLmRhdGEucHJvcHMuZW5hYmxlZCAhPT0gJzAnLFxuXG5cdFx0XHRzaGFyZWRXaXRoOiB7XG5cdFx0XHRcdHVzZXJzOiBbXSxcblx0XHRcdFx0Z3JvdXBzOiBbXVxuXHRcdFx0fVxuXG5cdFx0fSk7XG5cdFx0YW5ndWxhci5leHRlbmQodGhpcywgZGF0YSk7XG5cdFx0YW5ndWxhci5leHRlbmQodGhpcywge1xuXHRcdFx0b3duZXI6IGRhdGEuZGF0YS5wcm9wcy5vd25lci5zcGxpdCgnLycpLnNsaWNlKC0yLCAtMSlbMF1cblx0XHR9KTtcblxuXHRcdHZhciBzaGFyZXMgPSB0aGlzLmRhdGEucHJvcHMuaW52aXRlO1xuXHRcdGlmICh0eXBlb2Ygc2hhcmVzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBzaGFyZXMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0dmFyIGhyZWYgPSBzaGFyZXNbal0uaHJlZjtcblx0XHRcdFx0aWYgKGhyZWYubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGFjY2VzcyA9IHNoYXJlc1tqXS5hY2Nlc3M7XG5cdFx0XHRcdGlmIChhY2Nlc3MubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgcmVhZFdyaXRlID0gKHR5cGVvZiBhY2Nlc3MucmVhZFdyaXRlICE9PSAndW5kZWZpbmVkJyk7XG5cblx0XHRcdFx0aWYgKGhyZWYuc3RhcnRzV2l0aCgncHJpbmNpcGFsOnByaW5jaXBhbHMvdXNlcnMvJykpIHtcblx0XHRcdFx0XHR0aGlzLnNoYXJlZFdpdGgudXNlcnMucHVzaCh7XG5cdFx0XHRcdFx0XHRpZDogaHJlZi5zdWJzdHIoMjcpLFxuXHRcdFx0XHRcdFx0ZGlzcGxheW5hbWU6IGhyZWYuc3Vic3RyKDI3KSxcblx0XHRcdFx0XHRcdHdyaXRhYmxlOiByZWFkV3JpdGVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIGlmIChocmVmLnN0YXJ0c1dpdGgoJ3ByaW5jaXBhbDpwcmluY2lwYWxzL2dyb3Vwcy8nKSkge1xuXHRcdFx0XHRcdHRoaXMuc2hhcmVkV2l0aC5ncm91cHMucHVzaCh7XG5cdFx0XHRcdFx0XHRpZDogaHJlZi5zdWJzdHIoMjgpLFxuXHRcdFx0XHRcdFx0ZGlzcGxheW5hbWU6IGhyZWYuc3Vic3RyKDI4KSxcblx0XHRcdFx0XHRcdHdyaXRhYmxlOiByZWFkV3JpdGVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcblx0LmZhY3RvcnkoJ0NvbnRhY3RGaWx0ZXInLCBmdW5jdGlvbigpXG5cdHtcblx0XHRyZXR1cm4gZnVuY3Rpb24gQ29udGFjdEZpbHRlcihkYXRhKSB7XG5cdFx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCB7XG5cdFx0XHRcdG5hbWU6ICcnLFxuXHRcdFx0XHRjb3VudDogMFxuXHRcdFx0fSk7XG5cblx0XHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEpO1xuXHRcdH07XG5cdH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5mYWN0b3J5KCdDb250YWN0JywgZnVuY3Rpb24oJGZpbHRlciwgTWltZVNlcnZpY2UsIHV1aWQ0KSB7XG5cdHJldHVybiBmdW5jdGlvbiBDb250YWN0KGFkZHJlc3NCb29rLCB2Q2FyZCkge1xuXHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIHtcblxuXHRcdFx0ZGF0YToge30sXG5cdFx0XHRwcm9wczoge30sXG5cdFx0XHRmYWlsZWRQcm9wczogW10sXG5cblx0XHRcdGRhdGVQcm9wZXJ0aWVzOiBbJ2JkYXknLCAnYW5uaXZlcnNhcnknLCAnZGVhdGhkYXRlJ10sXG5cblx0XHRcdGFkZHJlc3NCb29rSWQ6IGFkZHJlc3NCb29rLmRpc3BsYXlOYW1lLFxuXHRcdFx0cmVhZE9ubHk6IGFkZHJlc3NCb29rLnJlYWRPbmx5LFxuXG5cdFx0XHR2ZXJzaW9uOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgndmVyc2lvbicpO1xuXHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHR9LFxuXG5cdFx0XHR1aWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBtb2RlbCA9IHRoaXM7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRyZXR1cm4gbW9kZWwuc2V0UHJvcGVydHkoJ3VpZCcsIHsgdmFsdWU6IHZhbHVlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGdldHRlclxuXHRcdFx0XHRcdHZhciB1aWQgPSBtb2RlbC5nZXRQcm9wZXJ0eSgndWlkJykudmFsdWU7XG5cdFx0XHRcdFx0LyogZ2xvYmFsIG1kNSAqL1xuXHRcdFx0XHRcdHJldHVybiB1dWlkNC52YWxpZGF0ZSh1aWQpID8gdWlkIDogbWQ1KHVpZCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGRpc3BsYXlOYW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRpc3BsYXlOYW1lID0gdGhpcy5mdWxsTmFtZSgpIHx8IHRoaXMub3JnKCkgfHwgJyc7XG5cdFx0XHRcdGlmKGFuZ3VsYXIuaXNBcnJheShkaXNwbGF5TmFtZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gZGlzcGxheU5hbWUuam9pbignICcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBkaXNwbGF5TmFtZTtcblx0XHRcdH0sXG5cblx0XHRcdHJlYWRhYmxlRmlsZW5hbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZih0aGlzLmRpc3BsYXlOYW1lKCkpIHtcblx0XHRcdFx0XHRyZXR1cm4gKHRoaXMuZGlzcGxheU5hbWUoKSkgKyAnLnZjZic7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gZmFsbGJhY2sgdG8gZGVmYXVsdCBmaWxlbmFtZSAoc2VlIGRvd25sb2FkIGF0dHJpYnV0ZSlcblx0XHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblxuXHRcdFx0Zmlyc3ROYW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgnbicpO1xuXHRcdFx0XHRpZiAocHJvcGVydHkpIHtcblx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWVbMV07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlzcGxheU5hbWUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0bGFzdE5hbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCduJyk7XG5cdFx0XHRcdGlmIChwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZVswXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaXNwbGF5TmFtZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRpdGlvbmFsTmFtZXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCduJyk7XG5cdFx0XHRcdGlmIChwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZVsyXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGZ1bGxOYW1lOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgbW9kZWwgPSB0aGlzO1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG5cdFx0XHRcdFx0Ly8gc2V0dGVyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoJ2ZuJywgeyB2YWx1ZTogdmFsdWUgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gZ2V0dGVyXG5cdFx0XHRcdFx0dmFyIHByb3BlcnR5ID0gbW9kZWwuZ2V0UHJvcGVydHkoJ2ZuJyk7XG5cdFx0XHRcdFx0aWYocHJvcGVydHkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHJvcGVydHkgPSBtb2RlbC5nZXRQcm9wZXJ0eSgnbicpO1xuXHRcdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWUuZmlsdGVyKGZ1bmN0aW9uKGVsZW0pIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGVsZW07XG5cdFx0XHRcdFx0XHR9KS5qb2luKCcgJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdHRpdGxlOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG5cdFx0XHRcdFx0Ly8gc2V0dGVyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoJ3RpdGxlJywgeyB2YWx1ZTogdmFsdWUgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gZ2V0dGVyXG5cdFx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgndGl0bGUnKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0b3JnOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCdvcmcnKTtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuXHRcdFx0XHRcdHZhciB2YWwgPSB2YWx1ZTtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHRcdFx0dmFsID0gcHJvcGVydHkudmFsdWU7XG5cdFx0XHRcdFx0XHR2YWxbMF0gPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoJ29yZycsIHsgdmFsdWU6IHZhbCB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZVswXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGVtYWlsOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gZ2V0dGVyXG5cdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ2VtYWlsJyk7XG5cdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdHBob3RvOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG5cdFx0XHRcdFx0Ly8gc2V0dGVyXG5cdFx0XHRcdFx0Ly8gc3BsaXRzIGltYWdlIGRhdGEgaW50byBcImRhdGE6aW1hZ2UvanBlZ1wiIGFuZCBiYXNlIDY0IGVuY29kZWQgaW1hZ2Vcblx0XHRcdFx0XHR2YXIgaW1hZ2VEYXRhID0gdmFsdWUuc3BsaXQoJztiYXNlNjQsJyk7XG5cdFx0XHRcdFx0dmFyIGltYWdlVHlwZSA9IGltYWdlRGF0YVswXS5zbGljZSgnZGF0YTonLmxlbmd0aCk7XG5cdFx0XHRcdFx0aWYgKCFpbWFnZVR5cGUuc3RhcnRzV2l0aCgnaW1hZ2UvJykpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aW1hZ2VUeXBlID0gaW1hZ2VUeXBlLnN1YnN0cmluZyg2KS50b1VwcGVyQ2FzZSgpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoJ3Bob3RvJywgeyB2YWx1ZTogaW1hZ2VEYXRhWzFdLCBtZXRhOiB7dHlwZTogW2ltYWdlVHlwZV0sIGVuY29kaW5nOiBbJ2InXX0gfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgncGhvdG8nKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBwcm9wZXJ0eS5tZXRhLnR5cGU7XG5cdFx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc0FycmF5KHR5cGUpKSB7XG5cdFx0XHRcdFx0XHRcdHR5cGUgPSB0eXBlWzBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCF0eXBlLnN0YXJ0c1dpdGgoJ2ltYWdlLycpKSB7XG5cdFx0XHRcdFx0XHRcdHR5cGUgPSAnaW1hZ2UvJyArIHR5cGUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnZGF0YTonICsgdHlwZSArICc7YmFzZTY0LCcgKyBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGNhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc1N0cmluZyh2YWx1ZSkpIHtcblx0XHRcdFx0XHRcdC8qIGNoZWNrIGZvciBlbXB0eSBzdHJpbmcgKi9cblx0XHRcdFx0XHRcdHRoaXMuc2V0UHJvcGVydHkoJ2NhdGVnb3JpZXMnLCB7IHZhbHVlOiAhdmFsdWUubGVuZ3RoID8gW10gOiBbdmFsdWVdIH0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5ndWxhci5pc0FycmF5KHZhbHVlKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5zZXRQcm9wZXJ0eSgnY2F0ZWdvcmllcycsIHsgdmFsdWU6IHZhbHVlIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCdjYXRlZ29yaWVzJyk7XG5cdFx0XHRcdFx0aWYoIXByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gW107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBbcHJvcGVydHkudmFsdWVdO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRmb3JtYXREYXRlQXNSRkM2MzUwOiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGRhdGEpIHx8IGFuZ3VsYXIuaXNVbmRlZmluZWQoZGF0YS52YWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gZGF0YTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5kYXRlUHJvcGVydGllcy5pbmRleE9mKG5hbWUpICE9PSAtMSkge1xuXHRcdFx0XHRcdHZhciBtYXRjaCA9IGRhdGEudmFsdWUubWF0Y2goL14oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KSQvKTtcblx0XHRcdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0XHRcdGRhdGEudmFsdWUgPSBtYXRjaFsxXSArIG1hdGNoWzJdICsgbWF0Y2hbM107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0XHR9LFxuXG5cdFx0XHRmb3JtYXREYXRlRm9yRGlzcGxheTogZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChkYXRhKSB8fCBhbmd1bGFyLmlzVW5kZWZpbmVkKGRhdGEudmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRoaXMuZGF0ZVByb3BlcnRpZXMuaW5kZXhPZihuYW1lKSAhPT0gLTEpIHtcblx0XHRcdFx0XHR2YXIgbWF0Y2ggPSBkYXRhLnZhbHVlLm1hdGNoKC9eKFxcZHs0fSkoXFxkezJ9KShcXGR7Mn0pJC8pO1xuXHRcdFx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRcdFx0ZGF0YS52YWx1ZSA9IG1hdGNoWzFdICsgJy0nICsgbWF0Y2hbMl0gKyAnLScgKyBtYXRjaFszXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZGF0YTtcblx0XHRcdH0sXG5cblx0XHRcdGdldFByb3BlcnR5OiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRcdGlmICh0aGlzLnByb3BzW25hbWVdKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZm9ybWF0RGF0ZUZvckRpc3BsYXkobmFtZSwgdGhpcy52YWxpZGF0ZShuYW1lLCB0aGlzLnByb3BzW25hbWVdWzBdKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGFkZFByb3BlcnR5OiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG5cdFx0XHRcdGRhdGEgPSBhbmd1bGFyLmNvcHkoZGF0YSk7XG5cdFx0XHRcdGRhdGEgPSB0aGlzLmZvcm1hdERhdGVBc1JGQzYzNTAobmFtZSwgZGF0YSk7XG5cdFx0XHRcdGlmKCF0aGlzLnByb3BzW25hbWVdKSB7XG5cdFx0XHRcdFx0dGhpcy5wcm9wc1tuYW1lXSA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBpZHggPSB0aGlzLnByb3BzW25hbWVdLmxlbmd0aDtcblx0XHRcdFx0dGhpcy5wcm9wc1tuYW1lXVtpZHhdID0gZGF0YTtcblxuXHRcdFx0XHQvLyBrZWVwIHZDYXJkIGluIHN5bmNcblx0XHRcdFx0dGhpcy5kYXRhLmFkZHJlc3NEYXRhID0gJGZpbHRlcignSlNPTjJ2Q2FyZCcpKHRoaXMucHJvcHMpO1xuXHRcdFx0XHRyZXR1cm4gaWR4O1xuXHRcdFx0fSxcblx0XHRcdHNldFByb3BlcnR5OiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG5cdFx0XHRcdGlmKCF0aGlzLnByb3BzW25hbWVdKSB7XG5cdFx0XHRcdFx0dGhpcy5wcm9wc1tuYW1lXSA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRhdGEgPSB0aGlzLmZvcm1hdERhdGVBc1JGQzYzNTAobmFtZSwgZGF0YSk7XG5cdFx0XHRcdHRoaXMucHJvcHNbbmFtZV1bMF0gPSBkYXRhO1xuXG5cdFx0XHRcdC8vIGtlZXAgdkNhcmQgaW4gc3luY1xuXHRcdFx0XHR0aGlzLmRhdGEuYWRkcmVzc0RhdGEgPSAkZmlsdGVyKCdKU09OMnZDYXJkJykodGhpcy5wcm9wcyk7XG5cdFx0XHR9LFxuXHRcdFx0cmVtb3ZlUHJvcGVydHk6IGZ1bmN0aW9uIChuYW1lLCBwcm9wKSB7XG5cdFx0XHRcdGFuZ3VsYXIuY29weShfLndpdGhvdXQodGhpcy5wcm9wc1tuYW1lXSwgcHJvcCksIHRoaXMucHJvcHNbbmFtZV0pO1xuXHRcdFx0XHRpZih0aGlzLnByb3BzW25hbWVdLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnByb3BzW25hbWVdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuZGF0YS5hZGRyZXNzRGF0YSA9ICRmaWx0ZXIoJ0pTT04ydkNhcmQnKSh0aGlzLnByb3BzKTtcblx0XHRcdH0sXG5cdFx0XHRzZXRFVGFnOiBmdW5jdGlvbihldGFnKSB7XG5cdFx0XHRcdHRoaXMuZGF0YS5ldGFnID0gZXRhZztcblx0XHRcdH0sXG5cdFx0XHRzZXRVcmw6IGZ1bmN0aW9uKGFkZHJlc3NCb29rLCB1aWQpIHtcblx0XHRcdFx0dGhpcy5kYXRhLnVybCA9IGFkZHJlc3NCb29rLnVybCArIHVpZCArICcudmNmJztcblx0XHRcdH0sXG5cdFx0XHRzZXRBZGRyZXNzQm9vazogZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0dGhpcy5hZGRyZXNzQm9va0lkID0gYWRkcmVzc0Jvb2suZGlzcGxheU5hbWU7XG5cdFx0XHRcdHRoaXMuZGF0YS51cmwgPSBhZGRyZXNzQm9vay51cmwgKyB0aGlzLnVpZCgpICsgJy52Y2YnO1xuXHRcdFx0fSxcblxuXHRcdFx0Z2V0SVNPRGF0ZTogZnVuY3Rpb24oZGF0ZSkge1xuXHRcdFx0XHRmdW5jdGlvbiBwYWQobnVtYmVyKSB7XG5cdFx0XHRcdFx0aWYgKG51bWJlciA8IDEwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJzAnICsgbnVtYmVyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gJycgKyBudW1iZXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgJycgK1xuXHRcdFx0XHRcdFx0cGFkKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEpICtcblx0XHRcdFx0XHRcdHBhZChkYXRlLmdldFVUQ0RhdGUoKSkgK1xuXHRcdFx0XHRcdFx0J1QnICsgcGFkKGRhdGUuZ2V0VVRDSG91cnMoKSkgK1xuXHRcdFx0XHRcdFx0cGFkKGRhdGUuZ2V0VVRDTWludXRlcygpKSArXG5cdFx0XHRcdFx0XHRwYWQoZGF0ZS5nZXRVVENTZWNvbmRzKCkpICsgJ1onO1xuXHRcdFx0fSxcblxuXHRcdFx0c3luY1ZDYXJkOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0XHR0aGlzLnNldFByb3BlcnR5KCdyZXYnLCB7IHZhbHVlOiB0aGlzLmdldElTT0RhdGUobmV3IERhdGUoKSkgfSk7XG5cdFx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0XHRfLmVhY2godGhpcy5kYXRlUHJvcGVydGllcywgZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0XHRcdGlmICghYW5ndWxhci5pc1VuZGVmaW5lZChzZWxmLnByb3BzW25hbWVdKSAmJiAhYW5ndWxhci5pc1VuZGVmaW5lZChzZWxmLnByb3BzW25hbWVdWzBdKSkge1xuXHRcdFx0XHRcdFx0Ly8gU2V0IGRhdGVzIGFnYWluIHRvIG1ha2Ugc3VyZSB0aGV5IGFyZSBpbiBSRkMtNjM1MCBmb3JtYXRcblx0XHRcdFx0XHRcdHNlbGYuc2V0UHJvcGVydHkobmFtZSwgc2VsZi5wcm9wc1tuYW1lXVswXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0Ly8gZm9yY2UgZm4gdG8gYmUgc2V0XG5cdFx0XHRcdHRoaXMuZnVsbE5hbWUodGhpcy5mdWxsTmFtZSgpKTtcblxuXHRcdFx0XHQvLyBrZWVwIHZDYXJkIGluIHN5bmNcblx0XHRcdFx0c2VsZi5kYXRhLmFkZHJlc3NEYXRhID0gJGZpbHRlcignSlNPTjJ2Q2FyZCcpKHNlbGYucHJvcHMpO1xuXG5cdFx0XHRcdC8vIFJldmFsaWRhdGUgYWxsIHByb3BzXG5cdFx0XHRcdF8uZWFjaChzZWxmLmZhaWxlZFByb3BzLCBmdW5jdGlvbihuYW1lLCBpbmRleCkge1xuXHRcdFx0XHRcdGlmICghYW5ndWxhci5pc1VuZGVmaW5lZChzZWxmLnByb3BzW25hbWVdKSAmJiAhYW5ndWxhci5pc1VuZGVmaW5lZChzZWxmLnByb3BzW25hbWVdWzBdKSkge1xuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgcHJldmlvdXNseSBmYWlsZWQgcHJvcGVydGllc1xuXHRcdFx0XHRcdFx0c2VsZi5mYWlsZWRQcm9wcy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHRcdFx0Ly8gQW5kIHJldmFsaWRhdGUgdGhlbSBhZ2FpblxuXHRcdFx0XHRcdFx0c2VsZi52YWxpZGF0ZShuYW1lLCBzZWxmLnByb3BzW25hbWVdWzBdKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZihhbmd1bGFyLmlzVW5kZWZpbmVkKHNlbGYucHJvcHNbbmFtZV0pIHx8IGFuZ3VsYXIuaXNVbmRlZmluZWQoc2VsZi5wcm9wc1tuYW1lXVswXSkpIHtcblx0XHRcdFx0XHRcdC8vIFByb3BlcnR5IGhhcyBiZWVuIHJlbW92ZWRcblx0XHRcdFx0XHRcdHNlbGYuZmFpbGVkUHJvcHMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHR9LFxuXG5cdFx0XHRtYXRjaGVzOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHBhdHRlcm4pIHx8IHBhdHRlcm4ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIG1vZGVsID0gdGhpcztcblx0XHRcdFx0dmFyIG1hdGNoaW5nUHJvcHMgPSBbJ2ZuJywgJ3RpdGxlJywgJ29yZycsICdlbWFpbCcsICduaWNrbmFtZScsICdub3RlJywgJ3VybCcsICdjbG91ZCcsICdhZHInLCAnaW1wcCcsICd0ZWwnLCAnZ2VuZGVyJywgJ3JlbGF0aW9uc2hpcCcsICdyZWxhdGVkJ10uZmlsdGVyKGZ1bmN0aW9uIChwcm9wTmFtZSkge1xuXHRcdFx0XHRcdGlmIChtb2RlbC5wcm9wc1twcm9wTmFtZV0pIHtcblx0XHRcdFx0XHRcdHJldHVybiBtb2RlbC5wcm9wc1twcm9wTmFtZV0uZmlsdGVyKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXByb3BlcnR5LnZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGF0dGVybi50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNBcnJheShwcm9wZXJ0eS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWUuZmlsdGVyKGZ1bmN0aW9uKHYpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB2LnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXR0ZXJuLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcblx0XHRcdFx0XHRcdFx0XHR9KS5sZW5ndGggPiAwO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdH0pLmxlbmd0aCA+IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBtYXRjaGluZ1Byb3BzLmxlbmd0aCA+IDA7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5cdFx0XHR2YWxpZGF0ZTogZnVuY3Rpb24ocHJvcCwgcHJvcGVydHkpIHtcblx0XHRcdFx0c3dpdGNoKHByb3ApIHtcblx0XHRcdFx0Y2FzZSAncmV2Jzpcblx0XHRcdFx0Y2FzZSAncHJvZGlkJzpcblx0XHRcdFx0Y2FzZSAndmVyc2lvbic6XG5cdFx0XHRcdFx0aWYgKCFhbmd1bGFyLmlzVW5kZWZpbmVkKHRoaXMucHJvcHNbcHJvcF0pICYmIHRoaXMucHJvcHNbcHJvcF0ubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5wcm9wc1twcm9wXSA9IFt0aGlzLnByb3BzW3Byb3BdWzBdXTtcblx0XHRcdFx0XHRcdGNvbnNvbGUud2Fybih0aGlzLnVpZCgpKyc6IFRvbyBtYW55ICcrcHJvcCsnIGZpZWxkcy4gU2F2aW5nIHRoaXMgb25lIG9ubHk6ICcgKyB0aGlzLnByb3BzW3Byb3BdWzBdLnZhbHVlKTtcblx0XHRcdFx0XHRcdHRoaXMuZmFpbGVkUHJvcHMucHVzaChwcm9wKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAnY2F0ZWdvcmllcyc6XG5cdFx0XHRcdFx0Ly8gQXZvaWQgdW5lc2NhcGVkIGNvbW1hc1xuXHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRpZihwcm9wZXJ0eS52YWx1ZS5qb2luKCc7JykuaW5kZXhPZignLCcpICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLmZhaWxlZFByb3BzLnB1c2gocHJvcCk7XG5cdFx0XHRcdFx0XHRcdHByb3BlcnR5LnZhbHVlID0gcHJvcGVydHkudmFsdWUuam9pbignLCcpLnNwbGl0KCcsJyk7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS53YXJuKHRoaXMudWlkKCkrJzogQ2F0ZWdvcmllcyBzcGxpdDogJyArIHByb3BlcnR5LnZhbHVlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFuZ3VsYXIuaXNTdHJpbmcocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRpZihwcm9wZXJ0eS52YWx1ZS5pbmRleE9mKCcsJykgIT09IC0xKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuZmFpbGVkUHJvcHMucHVzaChwcm9wKTtcblx0XHRcdFx0XHRcdFx0cHJvcGVydHkudmFsdWUgPSBwcm9wZXJ0eS52YWx1ZS5zcGxpdCgnLCcpO1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUud2Fybih0aGlzLnVpZCgpKyc6IENhdGVnb3JpZXMgc3BsaXQ6ICcgKyBwcm9wZXJ0eS52YWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIFJlbW92ZSBkdXBsaWNhdGUgY2F0ZWdvcmllcyBvbiBhcnJheVxuXHRcdFx0XHRcdGlmKHByb3BlcnR5LnZhbHVlLmxlbmd0aCAhPT0gMCAmJiBhbmd1bGFyLmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHR2YXIgdW5pcXVlQ2F0ZWdvcmllcyA9IF8udW5pcXVlKHByb3BlcnR5LnZhbHVlKTtcblx0XHRcdFx0XHRcdGlmKCFhbmd1bGFyLmVxdWFscyh1bmlxdWVDYXRlZ29yaWVzLCBwcm9wZXJ0eS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5mYWlsZWRQcm9wcy5wdXNoKHByb3ApO1xuXHRcdFx0XHRcdFx0XHRwcm9wZXJ0eS52YWx1ZSA9IHVuaXF1ZUNhdGVnb3JpZXM7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS53YXJuKHRoaXMudWlkKCkrJzogQ2F0ZWdvcmllcyBkdXBsaWNhdGU6ICcgKyBwcm9wZXJ0eS52YWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdwaG90byc6XG5cdFx0XHRcdFx0Ly8gQXZvaWQgdW5kZWZpbmVkIHBob3RvIHR5cGVcblx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQocHJvcGVydHkpKSB7XG5cdFx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChwcm9wZXJ0eS5tZXRhLnR5cGUpKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBtaW1lID0gTWltZVNlcnZpY2UuYjY0bWltZShwcm9wZXJ0eS52YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdGlmIChtaW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5mYWlsZWRQcm9wcy5wdXNoKHByb3ApO1xuXHRcdFx0XHRcdFx0XHRcdHByb3BlcnR5Lm1ldGEudHlwZT1bbWltZV07XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRQcm9wZXJ0eSgncGhvdG8nLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTpwcm9wZXJ0eS52YWx1ZSxcblx0XHRcdFx0XHRcdFx0XHRcdG1ldGE6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTpwcm9wZXJ0eS5tZXRhLnR5cGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVuY29kaW5nOnByb3BlcnR5Lm1ldGEuZW5jb2Rpbmdcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4odGhpcy51aWQoKSsnOiBQaG90byBkZXRlY3RlZCBhcyAnICsgcHJvcGVydHkubWV0YS50eXBlKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZhaWxlZFByb3BzLnB1c2gocHJvcCk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5yZW1vdmVQcm9wZXJ0eSgncGhvdG8nLCBwcm9wZXJ0eSk7XG5cdFx0XHRcdFx0XHRcdFx0cHJvcGVydHkgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKHRoaXMudWlkKCkrJzogUGhvdG8gcmVtb3ZlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eTtcblx0XHRcdH0sXG5cdFx0XHQvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbnNvbGUgKi9cblxuXHRcdFx0Zml4OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy52YWxpZGF0ZSgncmV2Jyk7XG5cdFx0XHRcdHRoaXMudmFsaWRhdGUoJ3ZlcnNpb24nKTtcblx0XHRcdFx0dGhpcy52YWxpZGF0ZSgncHJvZGlkJyk7XG5cdFx0XHRcdHJldHVybiB0aGlzLmZhaWxlZFByb3BzLmluZGV4T2YoJ3JldicpICE9PSAtMVxuXHRcdFx0XHRcdHx8IHRoaXMuZmFpbGVkUHJvcHMuaW5kZXhPZigncHJvZGlkJykgIT09IC0xXG5cdFx0XHRcdFx0fHwgdGhpcy5mYWlsZWRQcm9wcy5pbmRleE9mKCd2ZXJzaW9uJykgIT09IC0xO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cblx0XHRpZihhbmd1bGFyLmlzRGVmaW5lZCh2Q2FyZCkpIHtcblx0XHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMuZGF0YSwgdkNhcmQpO1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcy5wcm9wcywgJGZpbHRlcigndkNhcmQySlNPTicpKHRoaXMuZGF0YS5hZGRyZXNzRGF0YSkpO1xuXHRcdFx0Ly8gV2UgZG8gbm90IHdhbnQgdG8gc3RvcmUgb3VyIGFkZHJlc3Nib29rIHdpdGhpbiBjb250YWN0c1xuXHRcdFx0ZGVsZXRlIHRoaXMuZGF0YS5hZGRyZXNzQm9vaztcblx0XHR9IGVsc2Uge1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcy5wcm9wcywge1xuXHRcdFx0XHR2ZXJzaW9uOiBbe3ZhbHVlOiAnMy4wJ31dLFxuXHRcdFx0XHRmbjogW3t2YWx1ZTogdCgnY29udGFjdHMnLCAnTmV3IGNvbnRhY3QnKX1dXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuZGF0YS5hZGRyZXNzRGF0YSA9ICRmaWx0ZXIoJ0pTT04ydkNhcmQnKSh0aGlzLnByb3BzKTtcblx0XHR9XG5cblx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCdjYXRlZ29yaWVzJyk7XG5cdFx0aWYoIXByb3BlcnR5KSB7XG5cdFx0XHQvLyBjYXRlZ29yaWVzIHNob3VsZCBhbHdheXMgaGF2ZSB0aGUgc2FtZSB0eXBlIChhbiBhcnJheSlcblx0XHRcdHRoaXMuY2F0ZWdvcmllcyhbXSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHR0aGlzLmNhdGVnb3JpZXMoW3Byb3BlcnR5LnZhbHVlXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuXHQuZmFjdG9yeSgnR3JvdXAnLCBmdW5jdGlvbigpXG5cdHtcblx0XHRyZXR1cm4gZnVuY3Rpb24gR3JvdXAoZGF0YSkge1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcywge1xuXHRcdFx0XHRuYW1lOiAnJyxcblx0XHRcdFx0Y291bnQ6IDBcblx0XHRcdH0pO1xuXG5cdFx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhKTtcblx0XHR9O1xuXHR9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmFjdG9yeSgnQWRkcmVzc0Jvb2tTZXJ2aWNlJywgZnVuY3Rpb24oRGF2Q2xpZW50LCBEYXZTZXJ2aWNlLCBTZXR0aW5nc1NlcnZpY2UsIEFkZHJlc3NCb29rLCAkcSkge1xuXG5cdHZhciBhZGRyZXNzQm9va3MgPSBbXTtcblx0dmFyIGxvYWRQcm9taXNlID0gdW5kZWZpbmVkO1xuXG5cdHZhciBvYnNlcnZlckNhbGxiYWNrcyA9IFtdO1xuXG5cdHZhciBub3RpZnlPYnNlcnZlcnMgPSBmdW5jdGlvbihldmVudE5hbWUsIGFkZHJlc3NCb29rKSB7XG5cdFx0dmFyIGV2ID0ge1xuXHRcdFx0ZXZlbnQ6IGV2ZW50TmFtZSxcblx0XHRcdGFkZHJlc3NCb29rczogYWRkcmVzc0Jvb2tzLFxuXHRcdFx0YWRkcmVzc0Jvb2s6IGFkZHJlc3NCb29rLFxuXHRcdH07XG5cdFx0YW5ndWxhci5mb3JFYWNoKG9ic2VydmVyQ2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soZXYpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBsb2FkQWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGFkZHJlc3NCb29rcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXR1cm4gJHEud2hlbihhZGRyZXNzQm9va3MpO1xuXHRcdH1cblx0XHRpZiAoXy5pc1VuZGVmaW5lZChsb2FkUHJvbWlzZSkpIHtcblx0XHRcdGxvYWRQcm9taXNlID0gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0bG9hZFByb21pc2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGFkZHJlc3NCb29rcyA9IGFjY291bnQuYWRkcmVzc0Jvb2tzLm1hcChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgQWRkcmVzc0Jvb2soYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gbG9hZFByb21pc2U7XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRyZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRvYnNlcnZlckNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcblx0XHR9LFxuXG5cdFx0Z2V0QWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBsb2FkQWxsKCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rcztcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXRHcm91cHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9va3MpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rcy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdFx0XHRyZXR1cm4gZWxlbWVudC5ncm91cHM7XG5cdFx0XHRcdH0pLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEuY29uY2F0KGIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXREZWZhdWx0QWRkcmVzc0Jvb2s6IGZ1bmN0aW9uKHRocm93T0MpIHtcblx0XHRcdHZhciBpID0gYWRkcmVzc0Jvb2tzLmZpbmRJbmRleChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2suZW5hYmxlZCAmJiAhYWRkcmVzc0Jvb2sucmVhZE9ubHk7XG5cdFx0XHR9KTtcblx0XHRcdGlmIChpICE9PSAtMSkge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tzW2ldO1xuXHRcdFx0fSBlbHNlIGlmKHRocm93T0MpIHtcblx0XHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnVGhlcmUgaXMgbm8gYWRkcmVzcyBib29rIGF2YWlsYWJsZSB0byBjcmVhdGUgYSBjb250YWN0LicpKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0Z2V0QWRkcmVzc0Jvb2s6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5nZXRBZGRyZXNzQm9vayh7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdHZhciBhZGRyZXNzQm9vayA9IG5ldyBBZGRyZXNzQm9vayh7XG5cdFx0XHRcdFx0XHRhY2NvdW50OiBhY2NvdW50LFxuXHRcdFx0XHRcdFx0Y3RhZzogcmVzWzBdLnByb3BzLmdldGN0YWcsXG5cdFx0XHRcdFx0XHR1cmw6IGFjY291bnQuaG9tZVVybCtkaXNwbGF5TmFtZSsnLycsXG5cdFx0XHRcdFx0XHRkYXRhOiByZXNbMF0sXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogcmVzWzBdLnByb3BzLmRpc3BsYXluYW1lLFxuXHRcdFx0XHRcdFx0cmVzb3VyY2V0eXBlOiByZXNbMF0ucHJvcHMucmVzb3VyY2V0eXBlLFxuXHRcdFx0XHRcdFx0c3luY1Rva2VuOiByZXNbMF0ucHJvcHMuc3luY1Rva2VuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdjcmVhdGUnLCBhZGRyZXNzQm9vayk7XG5cdFx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRjcmVhdGU6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5jcmVhdGVBZGRyZXNzQm9vayh7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRkZWxldGU6IGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gRGF2Q2xpZW50LmRlbGV0ZUFkZHJlc3NCb29rKGFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBpbmRleCA9IGFkZHJlc3NCb29rcy5pbmRleE9mKGFkZHJlc3NCb29rKTtcblx0XHRcdFx0XHRhZGRyZXNzQm9va3Muc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2RlbGV0ZScsIGFkZHJlc3NCb29rKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0cmVuYW1lOiBmdW5jdGlvbihhZGRyZXNzQm9vaywgZGlzcGxheU5hbWUpIHtcblx0XHRcdHJldHVybiBEYXZTZXJ2aWNlLnRoZW4oZnVuY3Rpb24oYWNjb3VudCkge1xuXHRcdFx0XHRyZXR1cm4gRGF2Q2xpZW50LnJlbmFtZUFkZHJlc3NCb29rKGFkZHJlc3NCb29rLCB7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tzLmZpbHRlcihmdW5jdGlvbiAoZWxlbWVudCkge1xuXHRcdFx0XHRcdHJldHVybiBlbGVtZW50LmRpc3BsYXlOYW1lID09PSBkaXNwbGF5TmFtZTtcblx0XHRcdFx0fSlbMF07XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0c3luYzogZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdHJldHVybiBEYXZDbGllbnQuc3luY0FkZHJlc3NCb29rKGFkZHJlc3NCb29rKTtcblx0XHR9LFxuXG5cdFx0YWRkQ29udGFjdDogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNvbnRhY3QpIHtcblx0XHRcdC8vIFdlIGRvbid0IHdhbnQgdG8gYWRkIHRoZSBzYW1lIGNvbnRhY3QgYWdhaW5cblx0XHRcdGlmIChhZGRyZXNzQm9vay5jb250YWN0cy5pbmRleE9mKGNvbnRhY3QpID09PSAtMSkge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2suY29udGFjdHMucHVzaChjb250YWN0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0cmVtb3ZlQ29udGFjdDogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNvbnRhY3QpIHtcblx0XHRcdC8vIFdlIGNhbid0IHJlbW92ZSBhbiB1bmRlZmluZWQgb2JqZWN0XG5cdFx0XHRpZiAoYWRkcmVzc0Jvb2suY29udGFjdHMuaW5kZXhPZihjb250YWN0KSAhPT0gLTEpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rLmNvbnRhY3RzLnNwbGljZShhZGRyZXNzQm9vay5jb250YWN0cy5pbmRleE9mKGNvbnRhY3QpLCAxKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0dG9nZ2xlU3RhdGU6IGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHR2YXIgeG1sRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlRG9jdW1lbnQoJycsICcnLCBudWxsKTtcblx0XHRcdHZhciBkUHJvcFVwZGF0ZSA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdkOnByb3BlcnR5dXBkYXRlJyk7XG5cdFx0XHRkUHJvcFVwZGF0ZS5zZXRBdHRyaWJ1dGUoJ3htbG5zOmQnLCAnREFWOicpO1xuXHRcdFx0ZFByb3BVcGRhdGUuc2V0QXR0cmlidXRlKCd4bWxuczpvJywgJ2h0dHA6Ly9vd25jbG91ZC5vcmcvbnMnKTtcblx0XHRcdHhtbERvYy5hcHBlbmRDaGlsZChkUHJvcFVwZGF0ZSk7XG5cblx0XHRcdHZhciBkU2V0ID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ2Q6c2V0Jyk7XG5cdFx0XHRkUHJvcFVwZGF0ZS5hcHBlbmRDaGlsZChkU2V0KTtcblxuXHRcdFx0dmFyIGRQcm9wID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ2Q6cHJvcCcpO1xuXHRcdFx0ZFNldC5hcHBlbmRDaGlsZChkUHJvcCk7XG5cblx0XHRcdHZhciBvRW5hYmxlZCA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOmVuYWJsZWQnKTtcblx0XHRcdC8vIFJldmVydCBzdGF0ZSB0byB0b2dnbGVcblx0XHRcdG9FbmFibGVkLnRleHRDb250ZW50ID0gIWFkZHJlc3NCb29rLmVuYWJsZWQgPyAnMScgOiAnMCc7XG5cdFx0XHRkUHJvcC5hcHBlbmRDaGlsZChvRW5hYmxlZCk7XG5cblx0XHRcdHZhciBib2R5ID0gZFByb3BVcGRhdGUub3V0ZXJIVE1MO1xuXG5cdFx0XHRyZXR1cm4gRGF2Q2xpZW50Lnhoci5zZW5kKFxuXHRcdFx0XHRkYXYucmVxdWVzdC5iYXNpYyh7bWV0aG9kOiAnUFJPUFBBVENIJywgZGF0YTogYm9keX0pLFxuXHRcdFx0XHRhZGRyZXNzQm9vay51cmxcblx0XHRcdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDcpIHtcblx0XHRcdFx0XHRhZGRyZXNzQm9vay5lbmFibGVkID0gIWFkZHJlc3NCb29rLmVuYWJsZWQ7XG5cdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKFxuXHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2suZW5hYmxlZCA/ICdlbmFibGUnIDogJ2Rpc2FibGUnLFxuXHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2tcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBhZGRyZXNzQm9vaztcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRzaGFyZTogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIHNoYXJlVHlwZSwgc2hhcmVXaXRoLCB3cml0YWJsZSwgZXhpc3RpbmdTaGFyZSkge1xuXHRcdFx0dmFyIHhtbERvYyA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZURvY3VtZW50KCcnLCAnJywgbnVsbCk7XG5cdFx0XHR2YXIgb1NoYXJlID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ286c2hhcmUnKTtcblx0XHRcdG9TaGFyZS5zZXRBdHRyaWJ1dGUoJ3htbG5zOmQnLCAnREFWOicpO1xuXHRcdFx0b1NoYXJlLnNldEF0dHJpYnV0ZSgneG1sbnM6bycsICdodHRwOi8vb3duY2xvdWQub3JnL25zJyk7XG5cdFx0XHR4bWxEb2MuYXBwZW5kQ2hpbGQob1NoYXJlKTtcblxuXHRcdFx0dmFyIG9TZXQgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzZXQnKTtcblx0XHRcdG9TaGFyZS5hcHBlbmRDaGlsZChvU2V0KTtcblxuXHRcdFx0dmFyIGRIcmVmID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ2Q6aHJlZicpO1xuXHRcdFx0aWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9VU0VSKSB7XG5cdFx0XHRcdGRIcmVmLnRleHRDb250ZW50ID0gJ3ByaW5jaXBhbDpwcmluY2lwYWxzL3VzZXJzLyc7XG5cdFx0XHR9IGVsc2UgaWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCkge1xuXHRcdFx0XHRkSHJlZi50ZXh0Q29udGVudCA9ICdwcmluY2lwYWw6cHJpbmNpcGFscy9ncm91cHMvJztcblx0XHRcdH1cblx0XHRcdGRIcmVmLnRleHRDb250ZW50ICs9IHNoYXJlV2l0aDtcblx0XHRcdG9TZXQuYXBwZW5kQ2hpbGQoZEhyZWYpO1xuXG5cdFx0XHR2YXIgb1N1bW1hcnkgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzdW1tYXJ5Jyk7XG5cdFx0XHRvU3VtbWFyeS50ZXh0Q29udGVudCA9IHQoJ2NvbnRhY3RzJywgJ3thZGRyZXNzYm9va30gc2hhcmVkIGJ5IHtvd25lcn0nLCB7XG5cdFx0XHRcdGFkZHJlc3Nib29rOiBhZGRyZXNzQm9vay5kaXNwbGF5TmFtZSxcblx0XHRcdFx0b3duZXI6IGFkZHJlc3NCb29rLm93bmVyXG5cdFx0XHR9KTtcblx0XHRcdG9TZXQuYXBwZW5kQ2hpbGQob1N1bW1hcnkpO1xuXG5cdFx0XHRpZiAod3JpdGFibGUpIHtcblx0XHRcdFx0dmFyIG9SVyA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnJlYWQtd3JpdGUnKTtcblx0XHRcdFx0b1NldC5hcHBlbmRDaGlsZChvUlcpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgYm9keSA9IG9TaGFyZS5vdXRlckhUTUw7XG5cblx0XHRcdHJldHVybiBEYXZDbGllbnQueGhyLnNlbmQoXG5cdFx0XHRcdGRhdi5yZXF1ZXN0LmJhc2ljKHttZXRob2Q6ICdQT1NUJywgZGF0YTogYm9keX0pLFxuXHRcdFx0XHRhZGRyZXNzQm9vay51cmxcblx0XHRcdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcblx0XHRcdFx0XHRpZiAoIWV4aXN0aW5nU2hhcmUpIHtcblx0XHRcdFx0XHRcdGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUikge1xuXHRcdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLnVzZXJzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdGlkOiBzaGFyZVdpdGgsXG5cdFx0XHRcdFx0XHRcdFx0ZGlzcGxheW5hbWU6IHNoYXJlV2l0aCxcblx0XHRcdFx0XHRcdFx0XHR3cml0YWJsZTogd3JpdGFibGVcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCkge1xuXHRcdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLmdyb3Vwcy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRpZDogc2hhcmVXaXRoLFxuXHRcdFx0XHRcdFx0XHRcdGRpc3BsYXluYW1lOiBzaGFyZVdpdGgsXG5cdFx0XHRcdFx0XHRcdFx0d3JpdGFibGU6IHdyaXRhYmxlXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHR9LFxuXG5cdFx0dW5zaGFyZTogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIHNoYXJlVHlwZSwgc2hhcmVXaXRoKSB7XG5cdFx0XHR2YXIgeG1sRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlRG9jdW1lbnQoJycsICcnLCBudWxsKTtcblx0XHRcdHZhciBvU2hhcmUgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzaGFyZScpO1xuXHRcdFx0b1NoYXJlLnNldEF0dHJpYnV0ZSgneG1sbnM6ZCcsICdEQVY6Jyk7XG5cdFx0XHRvU2hhcmUuc2V0QXR0cmlidXRlKCd4bWxuczpvJywgJ2h0dHA6Ly9vd25jbG91ZC5vcmcvbnMnKTtcblx0XHRcdHhtbERvYy5hcHBlbmRDaGlsZChvU2hhcmUpO1xuXG5cdFx0XHR2YXIgb1JlbW92ZSA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnJlbW92ZScpO1xuXHRcdFx0b1NoYXJlLmFwcGVuZENoaWxkKG9SZW1vdmUpO1xuXG5cdFx0XHR2YXIgZEhyZWYgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnZDpocmVmJyk7XG5cdFx0XHRpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX1VTRVIpIHtcblx0XHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgPSAncHJpbmNpcGFsOnByaW5jaXBhbHMvdXNlcnMvJztcblx0XHRcdH0gZWxzZSBpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQKSB7XG5cdFx0XHRcdGRIcmVmLnRleHRDb250ZW50ID0gJ3ByaW5jaXBhbDpwcmluY2lwYWxzL2dyb3Vwcy8nO1xuXHRcdFx0fVxuXHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgKz0gc2hhcmVXaXRoO1xuXHRcdFx0b1JlbW92ZS5hcHBlbmRDaGlsZChkSHJlZik7XG5cdFx0XHR2YXIgYm9keSA9IG9TaGFyZS5vdXRlckhUTUw7XG5cblxuXHRcdFx0cmV0dXJuIERhdkNsaWVudC54aHIuc2VuZChcblx0XHRcdFx0ZGF2LnJlcXVlc3QuYmFzaWMoe21ldGhvZDogJ1BPU1QnLCBkYXRhOiBib2R5fSksXG5cdFx0XHRcdGFkZHJlc3NCb29rLnVybFxuXHRcdFx0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMCkge1xuXHRcdFx0XHRcdGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUikge1xuXHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2suc2hhcmVkV2l0aC51c2VycyA9IGFkZHJlc3NCb29rLnNoYXJlZFdpdGgudXNlcnMuZmlsdGVyKGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHVzZXIuaWQgIT09IHNoYXJlV2l0aDtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQKSB7XG5cdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLmdyb3VwcyA9IGFkZHJlc3NCb29rLnNoYXJlZFdpdGguZ3JvdXBzLmZpbHRlcihmdW5jdGlvbihncm91cHMpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGdyb3Vwcy5pZCAhPT0gc2hhcmVXaXRoO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vdG9kbyAtIHJlbW92ZSBlbnRyeSBmcm9tIGFkZHJlc3Nib29rIG9iamVjdFxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHR9XG5cblxuXHR9O1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnQ29udGFjdFNlcnZpY2UnLCBmdW5jdGlvbihEYXZDbGllbnQsIEFkZHJlc3NCb29rU2VydmljZSwgQ29udGFjdCwgR3JvdXAsIENvbnRhY3RGaWx0ZXIsICRxLCBDYWNoZUZhY3RvcnksIHV1aWQ0KSB7XG5cblx0dmFyIGNvbnRhY3RTZXJ2aWNlID0gdGhpcztcblxuXHR2YXIgY2FjaGVGaWxsZWQgPSBmYWxzZTtcblx0dmFyIGNvbnRhY3RzQ2FjaGUgPSBDYWNoZUZhY3RvcnkoJ2NvbnRhY3RzJyk7XG5cdHZhciBvYnNlcnZlckNhbGxiYWNrcyA9IFtdO1xuXHR2YXIgbG9hZFByb21pc2UgPSB1bmRlZmluZWQ7XG5cblx0dmFyIGFsbFVwZGF0ZXMgPSAkcS53aGVuKCk7XG5cdHRoaXMucXVldWVVcGRhdGUgPSBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0YWxsVXBkYXRlcyA9IGFsbFVwZGF0ZXMudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjb250YWN0U2VydmljZS51cGRhdGUoY29udGFjdCk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2sgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdG9ic2VydmVyQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXHR9O1xuXG5cdHZhciBub3RpZnlPYnNlcnZlcnMgPSBmdW5jdGlvbihldmVudE5hbWUsIHVpZCkge1xuXHRcdHZhciBldiA9IHtcblx0XHRcdGV2ZW50OiBldmVudE5hbWUsXG5cdFx0XHR1aWQ6IHVpZCxcblx0XHRcdGNvbnRhY3RzOiBjb250YWN0c0NhY2hlLnZhbHVlcygpXG5cdFx0fTtcblx0XHRhbmd1bGFyLmZvckVhY2gob2JzZXJ2ZXJDYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjayhldik7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5nZXRGdWxsQ29udGFjdHMgPSBmdW5jdGlvbihjb250YWN0cykge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdFx0dmFyIHByb21pc2VzID0gW107XG5cdFx0XHR2YXIgeGhyQWRkcmVzc0Jvb2tzID0gW107XG5cdFx0XHRjb250YWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRcdFx0Ly8gUmVncm91cCB1cmxzIGJ5IGFkZHJlc3Nib29rc1xuXHRcdFx0XHRpZihhZGRyZXNzQm9va3MuaW5kZXhPZihjb250YWN0LmFkZHJlc3NCb29rKSAhPT0gLTEpIHtcblx0XHRcdFx0XHQvLyBJbml0aWF0ZSBhcnJheSBpZiBubyBleGlzdHNcblx0XHRcdFx0XHR4aHJBZGRyZXNzQm9va3NbY29udGFjdC5hZGRyZXNzQm9va0lkXSA9IHhockFkZHJlc3NCb29rc1tjb250YWN0LmFkZHJlc3NCb29rSWRdIHx8IFtdO1xuXHRcdFx0XHRcdHhockFkZHJlc3NCb29rc1tjb250YWN0LmFkZHJlc3NCb29rSWRdLnB1c2goY29udGFjdC5kYXRhLnVybCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Ly8gR2V0IG91ciBmdWxsIHZDYXJkc1xuXHRcdFx0YWRkcmVzc0Jvb2tzLmZvckVhY2goZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0Ly8gT25seSBnbyB0aHJvdWdoIGVuYWJsZWQgYWRkcmVzc2Jvb2tzXG5cdFx0XHRcdC8vIFRob3VnaCB4aHJBZGRyZXNzQm9va3MgZG9lcyBub3QgY29udGFpbnMgY29udGFjdHMgZnJvbSBkaXNhYmxlZCBvbmVzXG5cdFx0XHRcdGlmKGFkZHJlc3NCb29rLmVuYWJsZWQpIHtcblx0XHRcdFx0XHRpZihhbmd1bGFyLmlzQXJyYXkoeGhyQWRkcmVzc0Jvb2tzW2FkZHJlc3NCb29rLmRpc3BsYXlOYW1lXSkpIHtcblx0XHRcdFx0XHRcdHZhciBwcm9taXNlID0gRGF2Q2xpZW50LmdldENvbnRhY3RzKGFkZHJlc3NCb29rLCB7fSwgeGhyQWRkcmVzc0Jvb2tzW2FkZHJlc3NCb29rLmRpc3BsYXlOYW1lXSkudGhlbihcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24odmNhcmRzKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHZjYXJkcy5tYXAoZnVuY3Rpb24odmNhcmQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBuZXcgQ29udGFjdChhZGRyZXNzQm9vaywgdmNhcmQpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzXykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RzXy5tYXAoZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gVmFsaWRhdGUgc29tZSBmaWVsZHNcblx0XHRcdFx0XHRcdFx0XHRcdGlmKGNvbnRhY3QuZml4KCkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2FuJ3QgdXNlIGB0aGlzYCBpbiB0aG9zZSBuZXN0ZWQgZnVuY3Rpb25zXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RTZXJ2aWNlLnVwZGF0ZShjb250YWN0KTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RzQ2FjaGUucHV0KGNvbnRhY3QudWlkKCksIGNvbnRhY3QpO1xuXHRcdFx0XHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2suY29udGFjdHMucHVzaChjb250YWN0KTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKHByb21pc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQkcS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdG5vdGlmeU9ic2VydmVycygnZ2V0RnVsbENvbnRhY3RzJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5maWxsQ2FjaGUgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoXy5pc1VuZGVmaW5lZChsb2FkUHJvbWlzZSkpIHtcblx0XHRcdGxvYWRQcm9taXNlID0gQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2tzKSB7XG5cdFx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xuXHRcdFx0XHRhZGRyZXNzQm9va3MuZm9yRWFjaChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdC8vIE9ubHkgZ28gdGhyb3VnaCBlbmFibGVkIGFkZHJlc3Nib29rc1xuXHRcdFx0XHRcdGlmKGFkZHJlc3NCb29rLmVuYWJsZWQpIHtcblx0XHRcdFx0XHRcdHByb21pc2VzLnB1c2goXG5cdFx0XHRcdFx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5zeW5jKGFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGFjdFNlcnZpY2UuYXBwZW5kQ29udGFjdHNGcm9tQWRkcmVzc2Jvb2soYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNhY2hlRmlsbGVkID0gdHJ1ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGxvYWRQcm9taXNlO1xuXHR9O1xuXG5cdHRoaXMuZ2V0QWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYoY2FjaGVGaWxsZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5maWxsQ2FjaGUoKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gY29udGFjdHNDYWNoZS52YWx1ZXMoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gJHEud2hlbihjb250YWN0c0NhY2hlLnZhbHVlcygpKTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy5nZXRDb250YWN0RmlsdGVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oY29udGFjdHMpIHtcblx0XHRcdHZhciBhbGxDb250YWN0cyA9IG5ldyBDb250YWN0RmlsdGVyKHtcblx0XHRcdFx0bmFtZTogdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJyksXG5cdFx0XHRcdGNvdW50OiBjb250YWN0cy5sZW5ndGhcblx0XHRcdH0pO1xuXHRcdFx0dmFyIG5vdEdyb3VwZWQgPSBuZXcgQ29udGFjdEZpbHRlcih7XG5cdFx0XHRcdG5hbWU6IHQoJ2NvbnRhY3RzJywgJ05vdCBncm91cGVkJyksXG5cdFx0XHRcdGNvdW50OiBjb250YWN0cy5maWx0ZXIoXG5cdFx0XHRcdFx0ZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNvbnRhY3QuY2F0ZWdvcmllcygpLmxlbmd0aCA9PT0gMDtcblx0XHRcdFx0XHR9KS5sZW5ndGhcblx0XHRcdH0pO1xuXHRcdFx0dmFyIGZpbHRlcnMgPSBbYWxsQ29udGFjdHNdO1xuXHRcdFx0Ly8gT25seSBoYXZlIE5vdCBHcm91cGVkIGlmIGF0IGxlYXN0IG9uZSBjb250YWN0IGluIGl0XG5cdFx0XHRpZihub3RHcm91cGVkLmNvdW50ICE9PSAwKSB7XG5cdFx0XHRcdGZpbHRlcnMucHVzaChub3RHcm91cGVkKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZpbHRlcnM7XG5cdFx0fSk7XG5cdH07XG5cblx0Ly8gZ2V0IGxpc3Qgb2YgZ3JvdXBzIGFuZCB0aGUgY291bnQgb2YgY29udGFjdHMgaW4gc2FpZCBncm91cHNcblx0dGhpcy5nZXRHcm91cExpc3QgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG5cdFx0XHQvLyBhbGxvdyBncm91cHMgd2l0aCBuYW1lcyBzdWNoIGFzIHRvU3RyaW5nXG5cdFx0XHR2YXIgZ3JvdXBzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuXHRcdFx0Ly8gY29sbGVjdCBjYXRlZ29yaWVzIGFuZCB0aGVpciBhc3NvY2lhdGVkIGNvdW50c1xuXHRcdFx0Y29udGFjdHMuZm9yRWFjaChmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdGNvbnRhY3QuY2F0ZWdvcmllcygpLmZvckVhY2goZnVuY3Rpb24oY2F0ZWdvcnkpIHtcblx0XHRcdFx0XHRncm91cHNbY2F0ZWdvcnldID0gZ3JvdXBzW2NhdGVnb3J5XSA/IGdyb3Vwc1tjYXRlZ29yeV0gKyAxIDogMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBfLmtleXMoZ3JvdXBzKS5tYXAoXG5cdFx0XHRcdGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgR3JvdXAoe1xuXHRcdFx0XHRcdFx0bmFtZToga2V5LFxuXHRcdFx0XHRcdFx0Y291bnQ6IGdyb3Vwc1trZXldXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZ2V0R3JvdXBzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihjb250YWN0cykge1xuXHRcdFx0cmV0dXJuIF8udW5pcShjb250YWN0cy5tYXAoZnVuY3Rpb24oZWxlbWVudCkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbWVudC5jYXRlZ29yaWVzKCk7XG5cdFx0XHR9KS5yZWR1Y2UoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRyZXR1cm4gYS5jb25jYXQoYik7XG5cdFx0XHR9LCBbXSkuc29ydCgpLCB0cnVlKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmdldEJ5SWQgPSBmdW5jdGlvbihhZGRyZXNzQm9va3MsIHVpZCkge1xuXHRcdHJldHVybiAoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZihjYWNoZUZpbGxlZCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsbENhY2hlKCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gY29udGFjdHNDYWNoZS5nZXQodWlkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gJHEud2hlbihjb250YWN0c0NhY2hlLmdldCh1aWQpKTtcblx0XHRcdH1cblx0XHR9KS5jYWxsKHRoaXMpXG5cdFx0XHQudGhlbihmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdGlmKGFuZ3VsYXIuaXNVbmRlZmluZWQoY29udGFjdCkpIHtcblx0XHRcdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdDb250YWN0IG5vdCBmb3VuZC4nKSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciBhZGRyZXNzQm9vayA9IGFkZHJlc3NCb29rcy5maW5kKGZ1bmN0aW9uKGJvb2spIHtcblx0XHRcdFx0XHRcdHJldHVybiBib29rLmRpc3BsYXlOYW1lID09PSBjb250YWN0LmFkZHJlc3NCb29rSWQ7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Ly8gRmV0Y2ggYW5kIHJldHVybiBmdWxsIGNvbnRhY3QgdmNhcmRcblx0XHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tcblx0XHRcdFx0XHRcdD8gRGF2Q2xpZW50LmdldENvbnRhY3RzKGFkZHJlc3NCb29rLCB7fSwgWyBjb250YWN0LmRhdGEudXJsIF0pLnRoZW4oZnVuY3Rpb24odmNhcmRzKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBuZXcgQ29udGFjdChhZGRyZXNzQm9vaywgdmNhcmRzWzBdKTtcblx0XHRcdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24obmV3Q29udGFjdCkge1xuXHRcdFx0XHRcdFx0XHRjb250YWN0c0NhY2hlLnB1dChjb250YWN0LnVpZCgpLCBuZXdDb250YWN0KTtcblx0XHRcdFx0XHRcdFx0dmFyIGNvbnRhY3RJbmRleCA9IGFkZHJlc3NCb29rLmNvbnRhY3RzLmZpbmRJbmRleChmdW5jdGlvbih0ZXN0ZWRDb250YWN0KSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRlc3RlZENvbnRhY3QudWlkKCkgPT09IGNvbnRhY3QudWlkKCk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5jb250YWN0c1tjb250YWN0SW5kZXhdID0gbmV3Q29udGFjdDtcblx0XHRcdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdnZXRGdWxsQ29udGFjdHMnLCBjb250YWN0LnVpZCgpKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5ld0NvbnRhY3Q7XG5cdFx0XHRcdFx0XHR9KSA6IGNvbnRhY3Q7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuY3JlYXRlID0gZnVuY3Rpb24obmV3Q29udGFjdCwgYWRkcmVzc0Jvb2ssIHVpZCwgZnJvbUltcG9ydCkge1xuXHRcdGFkZHJlc3NCb29rID0gYWRkcmVzc0Jvb2sgfHwgQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vayh0cnVlKTtcblxuXHRcdC8vIE5vIGFkZHJlc3NCb29rIGF2YWlsYWJsZVxuXHRcdGlmKCFhZGRyZXNzQm9vaykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmKGFkZHJlc3NCb29rLnJlYWRPbmx5KSB7XG5cdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdZb3UgZG9uXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gd3JpdGUgdG8gdGhpcyBhZGRyZXNzYm9vay4nKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRuZXdDb250YWN0ID0gbmV3Q29udGFjdCB8fCBuZXcgQ29udGFjdChhZGRyZXNzQm9vayk7XG5cdFx0fSBjYXRjaChlcnJvcikge1xuXHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnQ29udGFjdCBjb3VsZCBub3QgYmUgY3JlYXRlZC4nKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBuZXdVaWQgPSAnJztcblx0XHRpZih1dWlkNC52YWxpZGF0ZSh1aWQpKSB7XG5cdFx0XHRuZXdVaWQgPSB1aWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG5ld1VpZCA9IHV1aWQ0LmdlbmVyYXRlKCk7XG5cdFx0fVxuXHRcdG5ld0NvbnRhY3QudWlkKG5ld1VpZCk7XG5cdFx0bmV3Q29udGFjdC5zZXRVcmwoYWRkcmVzc0Jvb2ssIG5ld1VpZCk7XG5cdFx0bmV3Q29udGFjdC5hZGRyZXNzQm9va0lkID0gYWRkcmVzc0Jvb2suZGlzcGxheU5hbWU7XG5cdFx0aWYgKF8uaXNVbmRlZmluZWQobmV3Q29udGFjdC5mdWxsTmFtZSgpKSB8fCBuZXdDb250YWN0LmZ1bGxOYW1lKCkgPT09ICcnKSB7XG5cdFx0XHRuZXdDb250YWN0LmZ1bGxOYW1lKG5ld0NvbnRhY3QuZGlzcGxheU5hbWUoKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIERhdkNsaWVudC5jcmVhdGVDYXJkKFxuXHRcdFx0YWRkcmVzc0Jvb2ssXG5cdFx0XHR7XG5cdFx0XHRcdGRhdGE6IG5ld0NvbnRhY3QuZGF0YS5hZGRyZXNzRGF0YSxcblx0XHRcdFx0ZmlsZW5hbWU6IG5ld1VpZCArICcudmNmJ1xuXHRcdFx0fVxuXHRcdCkudGhlbihmdW5jdGlvbih4aHIpIHtcblx0XHRcdG5ld0NvbnRhY3Quc2V0RVRhZyh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ09DLUVUYWcnKSB8fCB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0VUYWcnKSk7XG5cdFx0XHRjb250YWN0c0NhY2hlLnB1dChuZXdVaWQsIG5ld0NvbnRhY3QpO1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmFkZENvbnRhY3QoYWRkcmVzc0Jvb2ssIG5ld0NvbnRhY3QpO1xuXHRcdFx0aWYgKGZyb21JbXBvcnQgIT09IHRydWUpIHtcblx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdjcmVhdGUnLCBuZXdVaWQpO1xuXHRcdFx0XHQkKCcjZGV0YWlscy1mdWxsTmFtZScpLnNlbGVjdCgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5ld0NvbnRhY3Q7XG5cdFx0fSkuY2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdDb250YWN0IGNvdWxkIG5vdCBiZSBjcmVhdGVkLicpKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmltcG9ydCA9IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIGFkZHJlc3NCb29rLCBwcm9ncmVzc0NhbGxiYWNrKSB7XG5cdFx0YWRkcmVzc0Jvb2sgPSBhZGRyZXNzQm9vayB8fCBBZGRyZXNzQm9va1NlcnZpY2UuZ2V0RGVmYXVsdEFkZHJlc3NCb29rKHRydWUpO1xuXG5cdFx0Ly8gTm8gYWRkcmVzc0Jvb2sgYXZhaWxhYmxlXG5cdFx0aWYoIWFkZHJlc3NCb29rKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHJlZ2V4cCA9IC9CRUdJTjpWQ0FSRFtcXHNcXFNdKj9FTkQ6VkNBUkQvbWdpO1xuXHRcdHZhciBzaW5nbGVWQ2FyZHMgPSBkYXRhLm1hdGNoKHJlZ2V4cCk7XG5cblx0XHRpZiAoIXNpbmdsZVZDYXJkcykge1xuXHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnTm8gY29udGFjdHMgaW4gZmlsZS4gT25seSB2Q2FyZCBmaWxlcyBhcmUgYWxsb3dlZC4nKSk7XG5cdFx0XHRpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xuXHRcdFx0XHRwcm9ncmVzc0NhbGxiYWNrKDEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vdGlmeU9ic2VydmVycygnaW1wb3J0c3RhcnQnKTtcblxuXHRcdHZhciBudW0gPSAxO1xuXHRcdGZvcih2YXIgaSBpbiBzaW5nbGVWQ2FyZHMpIHtcblx0XHRcdHZhciBuZXdDb250YWN0ID0gbmV3IENvbnRhY3QoYWRkcmVzc0Jvb2ssIHthZGRyZXNzRGF0YTogc2luZ2xlVkNhcmRzW2ldfSk7XG5cdFx0XHRpZiAoWyczLjAnLCAnNC4wJ10uaW5kZXhPZihuZXdDb250YWN0LnZlcnNpb24oKSkgPCAwKSB7XG5cdFx0XHRcdGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XG5cdFx0XHRcdFx0cHJvZ3Jlc3NDYWxsYmFjayhudW0gLyBzaW5nbGVWQ2FyZHMubGVuZ3RoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdPbmx5IHZDYXJkIHZlcnNpb24gNC4wIChSRkM2MzUwKSBvciB2ZXJzaW9uIDMuMCAoUkZDMjQyNikgYXJlIHN1cHBvcnRlZC4nKSk7XG5cdFx0XHRcdG51bSsrO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcblx0XHRcdHRoaXMuY3JlYXRlKG5ld0NvbnRhY3QsIGFkZHJlc3NCb29rLCAnJywgdHJ1ZSkudGhlbihmdW5jdGlvbih4aHJDb250YWN0KSB7XG5cdFx0XHRcdGlmICh4aHJDb250YWN0ICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdHZhciB4aHJDb250YWN0TmFtZSA9IHhockNvbnRhY3QuZGlzcGxheU5hbWUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHByb2dyZXNzIGluZGljYXRvclxuXHRcdFx0XHRpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xuXHRcdFx0XHRcdHByb2dyZXNzQ2FsbGJhY2sobnVtIC8gc2luZ2xlVkNhcmRzLmxlbmd0aCwgeGhyQ29udGFjdE5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG51bSsrO1xuXHRcdFx0XHQvKiBJbXBvcnQgaXMgb3ZlciwgbGV0J3Mgbm90aWZ5ICovXG5cdFx0XHRcdGlmIChudW0gPT09IHNpbmdsZVZDYXJkcy5sZW5ndGggKyAxKSB7XG5cdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdpbXBvcnRlbmQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdHRoaXMubW92ZUNvbnRhY3QgPSBmdW5jdGlvbihjb250YWN0LCBhZGRyZXNzQm9vaywgb2xkQWRkcmVzc0Jvb2spIHtcblx0XHRpZiAoYWRkcmVzc0Jvb2sgIT09IG51bGwgJiYgY29udGFjdC5hZGRyZXNzQm9va0lkID09PSBhZGRyZXNzQm9vay5kaXNwbGF5TmFtZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoYWRkcmVzc0Jvb2sucmVhZE9ubHkpIHtcblx0XHRcdE9DLk5vdGlmaWNhdGlvbi5zaG93VGVtcG9yYXJ5KHQoJ2NvbnRhY3RzJywgJ1lvdSBkb25cXCd0IGhhdmUgcGVybWlzc2lvbiB0byB3cml0ZSB0byB0aGlzIGFkZHJlc3Nib29rLicpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29udGFjdC5zeW5jVkNhcmQoKTtcblxuXHRcdERhdkNsaWVudC54aHIuc2VuZChcblx0XHRcdGRhdi5yZXF1ZXN0LmJhc2ljKHttZXRob2Q6ICdNT1ZFJywgZGVzdGluYXRpb246IGFkZHJlc3NCb29rLnVybCArIGNvbnRhY3QuZGF0YS51cmwuc3BsaXQoJy8nKS5wb3AoLTEpfSksXG5cdFx0XHRjb250YWN0LmRhdGEudXJsXG5cdFx0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcblx0XHRcdFx0Y29udGFjdC5zZXRBZGRyZXNzQm9vayhhZGRyZXNzQm9vayk7XG5cdFx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5hZGRDb250YWN0KGFkZHJlc3NCb29rLCBjb250YWN0KTtcblx0XHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnJlbW92ZUNvbnRhY3Qob2xkQWRkcmVzc0Jvb2ssIGNvbnRhY3QpO1xuXHRcdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2dyb3Vwc1VwZGF0ZScpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnQ29udGFjdCBjb3VsZCBub3QgYmUgbW92ZWQuJykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdC8vIHVwZGF0ZSByZXYgZmllbGRcblx0XHRjb250YWN0LnN5bmNWQ2FyZCgpO1xuXG5cdFx0Ly8gdXBkYXRlIGNvbnRhY3Qgb24gc2VydmVyXG5cdFx0cmV0dXJuIERhdkNsaWVudC51cGRhdGVDYXJkKGNvbnRhY3QuZGF0YSwge2pzb246IHRydWV9KS50aGVuKGZ1bmN0aW9uKHhocikge1xuXHRcdFx0dmFyIG5ld0V0YWcgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ09DLUVUYWcnKSB8fCB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0VUYWcnKTtcblx0XHRcdGNvbnRhY3Quc2V0RVRhZyhuZXdFdGFnKTtcblx0XHRcdG5vdGlmeU9ic2VydmVycygndXBkYXRlJywgY29udGFjdC51aWQoKSk7XG5cdFx0fSkuY2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdDb250YWN0IGNvdWxkIG5vdCBiZSBzYXZlZC4nKSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5kZWxldGUgPSBmdW5jdGlvbihhZGRyZXNzQm9vaywgY29udGFjdCkge1xuXHRcdC8vIGRlbGV0ZSBjb250YWN0IGZyb20gc2VydmVyXG5cdFx0cmV0dXJuIERhdkNsaWVudC5kZWxldGVDYXJkKGNvbnRhY3QuZGF0YSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdGNvbnRhY3RzQ2FjaGUucmVtb3ZlKGNvbnRhY3QudWlkKCkpO1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnJlbW92ZUNvbnRhY3QoYWRkcmVzc0Jvb2ssIGNvbnRhY3QpO1xuXHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdkZWxldGUnLCBjb250YWN0LnVpZCgpKTtcblx0XHR9KTtcblx0fTtcblxuXHQvKlxuXHQgKiBEZWxldGUgYWxsIGNvbnRhY3RzIHByZXNlbnQgaW4gdGhlIGFkZHJlc3NCb29rIGZyb20gdGhlIGNhY2hlXG5cdCAqL1xuXHR0aGlzLnJlbW92ZUNvbnRhY3RzRnJvbUFkZHJlc3Nib29rID0gZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNhbGxiYWNrKSB7XG5cdFx0YW5ndWxhci5mb3JFYWNoKGFkZHJlc3NCb29rLmNvbnRhY3RzLCBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRjb250YWN0c0NhY2hlLnJlbW92ZShjb250YWN0LnVpZCgpKTtcblx0XHR9KTtcblx0XHRjYWxsYmFjaygpO1xuXHRcdG5vdGlmeU9ic2VydmVycygnZ3JvdXBzVXBkYXRlJyk7XG5cdH07XG5cblx0Lypcblx0ICogQ3JlYXRlIGFuZCBhcHBlbmQgY29udGFjdHMgdG8gdGhlIGFkZHJlc3NCb29rXG5cdCAqL1xuXHR0aGlzLmFwcGVuZENvbnRhY3RzRnJvbUFkZHJlc3Nib29rID0gZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNhbGxiYWNrKSB7XG5cdFx0Ly8gQWRkcmVzc2Jvb2sgaGFzIGJlZW4gaW5pdGlhdGVkIGJ1dCBjb250YWN0cyBoYXZlIG5vdCBiZWVuIGZldGNoZWRcblx0XHRpZiAoYWRkcmVzc0Jvb2sub2JqZWN0cyA9PT0gbnVsbCkge1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnN5bmMoYWRkcmVzc0Jvb2spLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0Y29udGFjdFNlcnZpY2UuYXBwZW5kQ29udGFjdHNGcm9tQWRkcmVzc2Jvb2soYWRkcmVzc0Jvb2ssIGNhbGxiYWNrKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAoYWRkcmVzc0Jvb2suY29udGFjdHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHQvLyBPbmx5IGFkZCBjb250YWN0IGlmIHRoZSBhZGRyZXNzQm9vayBkb2Vzbid0IGFscmVhZHkgaGF2ZSBpdFxuXHRcdFx0YWRkcmVzc0Jvb2sub2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKHZjYXJkKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Ly8gT25seSBhZGQgY29udGFjdCBpZiB0aGUgYWRkcmVzc0Jvb2sgZG9lc24ndCBhbHJlYWR5IGhhdmUgaXRcblx0XHRcdFx0XHR2YXIgY29udGFjdCA9IG5ldyBDb250YWN0KGFkZHJlc3NCb29rLCB2Y2FyZCk7XG5cdFx0XHRcdFx0Y29udGFjdHNDYWNoZS5wdXQoY29udGFjdC51aWQoKSwgY29udGFjdCk7XG5cdFx0XHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmFkZENvbnRhY3QoYWRkcmVzc0Jvb2ssIGNvbnRhY3QpO1xuXHRcdFx0XHR9IGNhdGNoKGVycm9yKSB7XG5cdFx0XHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnSW52YWxpZCBjb250YWN0IHJlY2VpdmVkOiAnLCB2Y2FyZCwgZXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gQ29udGFjdCBhcmUgYWxyZWFkeSBwcmVzZW50IGluIHRoZSBhZGRyZXNzQm9va1xuXHRcdFx0YW5ndWxhci5mb3JFYWNoKGFkZHJlc3NCb29rLmNvbnRhY3RzLCBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdGNvbnRhY3RzQ2FjaGUucHV0KGNvbnRhY3QudWlkKCksIGNvbnRhY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdG5vdGlmeU9ic2VydmVycygnZ3JvdXBzVXBkYXRlJyk7XG5cdFx0aWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdEYXZDbGllbnQnLCBmdW5jdGlvbigpIHtcblx0dmFyIHhociA9IG5ldyBkYXYudHJhbnNwb3J0LkJhc2ljKFxuXHRcdG5ldyBkYXYuQ3JlZGVudGlhbHMoKVxuXHQpO1xuXHRyZXR1cm4gbmV3IGRhdi5DbGllbnQoeGhyKTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdEYXZTZXJ2aWNlJywgZnVuY3Rpb24oRGF2Q2xpZW50KSB7XG5cdHJldHVybiBEYXZDbGllbnQuY3JlYXRlQWNjb3VudCh7XG5cdFx0c2VydmVyOiBPQy5saW5rVG9SZW1vdGUoJ2Rhdi9hZGRyZXNzYm9va3MnKSxcblx0XHRhY2NvdW50VHlwZTogJ2NhcmRkYXYnLFxuXHRcdHVzZVByb3ZpZGVkUGF0aDogdHJ1ZVxuXHR9KTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdJbXBvcnRTZXJ2aWNlJywgZnVuY3Rpb24oKSB7XG5cblx0dGhpcy5pbXBvcnRpbmcgPSBmYWxzZTtcblx0dGhpcy5zZWxlY3RlZEFkZHJlc3NCb29rID0gdCgnY29udGFjdHMnLCAnSW1wb3J0IGludG8nKTtcblx0dGhpcy5pbXBvcnRlZFVzZXIgPSB0KCdjb250YWN0cycsICdXYWl0aW5nIGZvciB0aGUgc2VydmVyIHRvIGJlIHJlYWR54oCmJyk7XG5cdHRoaXMuaW1wb3J0UGVyY2VudCA9IDA7XG5cblx0dGhpcy50ID0ge1xuXHRcdGltcG9ydFRleHQgOiB0KCdjb250YWN0cycsICdJbXBvcnQgaW50bycpLFxuXHRcdGltcG9ydGluZ1RleHQgOiB0KCdjb250YWN0cycsICdJbXBvcnRpbmfigKYnKVxuXHR9O1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG5cdC5zZXJ2aWNlKCdNaW1lU2VydmljZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtYWdpY051bWJlcnMgPSB7XG5cdFx0XHQnLzlqLycgOiAnSlBFRycsXG5cdFx0XHQnUjBsR09EJyA6ICdHSUYnLFxuXHRcdFx0J2lWQk9SdzBLR2dvJyA6ICdQTkcnXG5cdFx0fTtcblxuXHRcdHRoaXMuYjY0bWltZSA9IGZ1bmN0aW9uKGI2NHN0cmluZykge1xuXHRcdFx0Zm9yICh2YXIgbW4gaW4gbWFnaWNOdW1iZXJzKSB7XG5cdFx0XHRcdGlmKGI2NHN0cmluZy5zdGFydHNXaXRoKG1uKSkgcmV0dXJuIG1hZ2ljTnVtYmVyc1ttbl07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9O1xuXHR9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnU2VhcmNoU2VydmljZScsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2VhcmNoVGVybSA9ICcnO1xuXG5cdHZhciBvYnNlcnZlckNhbGxiYWNrcyA9IFtdO1xuXG5cdHRoaXMucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRvYnNlcnZlckNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcblx0fTtcblxuXHR2YXIgbm90aWZ5T2JzZXJ2ZXJzID0gZnVuY3Rpb24oZXZlbnROYW1lKSB7XG5cdFx0dmFyIGV2ID0ge1xuXHRcdFx0ZXZlbnQ6ZXZlbnROYW1lLFxuXHRcdFx0c2VhcmNoVGVybTpzZWFyY2hUZXJtXG5cdFx0fTtcblx0XHRhbmd1bGFyLmZvckVhY2gob2JzZXJ2ZXJDYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjayhldik7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIFNlYXJjaFByb3h5ID0ge1xuXHRcdGF0dGFjaDogZnVuY3Rpb24oc2VhcmNoKSB7XG5cdFx0XHRzZWFyY2guc2V0RmlsdGVyKCdjb250YWN0cycsIHRoaXMuZmlsdGVyUHJveHkpO1xuXHRcdH0sXG5cdFx0ZmlsdGVyUHJveHk6IGZ1bmN0aW9uKHF1ZXJ5KSB7XG5cdFx0XHRzZWFyY2hUZXJtID0gcXVlcnk7XG5cdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2NoYW5nZVNlYXJjaCcpO1xuXHRcdH1cblx0fTtcblxuXHR0aGlzLmdldFNlYXJjaFRlcm0gPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gc2VhcmNoVGVybTtcblx0fTtcblxuXHR0aGlzLmNsZWFuU2VhcmNoID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFfLmlzVW5kZWZpbmVkKCQoJy5zZWFyY2hib3gnKSkpIHtcblx0XHRcdCQoJy5zZWFyY2hib3gnKVswXS5yZXNldCgpO1xuXHRcdH1cblx0XHRzZWFyY2hUZXJtID0gJyc7XG5cdH07XG5cblx0aWYgKCFfLmlzVW5kZWZpbmVkKE9DLlBsdWdpbnMpKSB7XG5cdFx0T0MuUGx1Z2lucy5yZWdpc3RlcignT0NBLlNlYXJjaCcsIFNlYXJjaFByb3h5KTtcblx0XHRpZiAoIV8uaXNVbmRlZmluZWQoT0NBLlNlYXJjaCkpIHtcblx0XHRcdE9DLlNlYXJjaCA9IG5ldyBPQ0EuU2VhcmNoKCQoJyNzZWFyY2hib3gnKSwgJCgnI3NlYXJjaHJlc3VsdHMnKSk7XG5cdFx0XHQkKCcjc2VhcmNoYm94Jykuc2hvdygpO1xuXHRcdH1cblx0fVxuXG5cdGlmICghXy5pc1VuZGVmaW5lZCgkKCcuc2VhcmNoYm94JykpKSB7XG5cdFx0JCgnLnNlYXJjaGJveCcpWzBdLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0aWYoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRub3RpZnlPYnNlcnZlcnMoJ3N1Ym1pdFNlYXJjaCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnU2V0dGluZ3NTZXJ2aWNlJywgZnVuY3Rpb24oKSB7XG5cdHZhciBzZXR0aW5ncyA9IHtcblx0XHRhZGRyZXNzQm9va3M6IFtcblx0XHRcdCd0ZXN0QWRkcidcblx0XHRdXG5cdH07XG5cblx0dGhpcy5zZXQgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0c2V0dGluZ3Nba2V5XSA9IHZhbHVlO1xuXHR9O1xuXG5cdHRoaXMuZ2V0ID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzW2tleV07XG5cdH07XG5cblx0dGhpcy5nZXRBbGwgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gc2V0dGluZ3M7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnU29ydEJ5U2VydmljZScsIGZ1bmN0aW9uICgpIHtcblx0dmFyIHN1YnNjcmlwdGlvbnMgPSBbXTtcblxuXHQvLyBBcnJheSBvZiBrZXlzIHRvIHNvcnQgYnkuIE9yZGVyZWQgYnkgcHJpb3JpdGllcy5cblx0dmFyIHNvcnRPcHRpb25zID0ge1xuXHRcdHNvcnRGaXJzdE5hbWU6IFsnZmlyc3ROYW1lJywgJ2xhc3ROYW1lJywgJ3VpZCddLFxuXHRcdHNvcnRMYXN0TmFtZTogWydsYXN0TmFtZScsICdmaXJzdE5hbWUnLCAndWlkJ10sXG5cdFx0c29ydERpc3BsYXlOYW1lOiBbJ2Rpc3BsYXlOYW1lJywgJ3VpZCddXG5cdH07XG5cblx0Ly8gS2V5XG5cdHZhciBzb3J0QnkgPSAnc29ydERpc3BsYXlOYW1lJztcblxuXHR2YXIgZGVmYXVsdE9yZGVyID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb250YWN0c19kZWZhdWx0X29yZGVyJyk7XG5cdGlmIChkZWZhdWx0T3JkZXIpIHtcblx0XHRzb3J0QnkgPSBkZWZhdWx0T3JkZXI7XG5cdH1cblxuXHRmdW5jdGlvbiBub3RpZnlPYnNlcnZlcnMoKSB7XG5cdFx0YW5ndWxhci5mb3JFYWNoKHN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzY3JpcHRpb24pIHtcblx0XHRcdGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHN1YnNjcmlwdGlvbihzb3J0T3B0aW9uc1tzb3J0QnldKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0c3Vic2NyaWJlOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0XHRcdHN1YnNjcmlwdGlvbnMucHVzaChjYWxsYmFjayk7XG5cdFx0fSxcblx0XHRzZXRTb3J0Qnk6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0c29ydEJ5ID0gdmFsdWU7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvbnRhY3RzX2RlZmF1bHRfb3JkZXInLCB2YWx1ZSk7XG5cdFx0XHRub3RpZnlPYnNlcnZlcnMoKTtcblx0XHR9LFxuXHRcdGdldFNvcnRCeTogZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIHNvcnRPcHRpb25zW3NvcnRCeV07XG5cdFx0fSxcblx0XHRnZXRTb3J0QnlLZXk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBzb3J0Qnk7XG5cdFx0fSxcblx0XHRnZXRTb3J0QnlMaXN0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzb3J0RGlzcGxheU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0Rpc3BsYXkgbmFtZScpLFxuXHRcdFx0XHRzb3J0Rmlyc3ROYW1lOiB0KCdjb250YWN0cycsICdGaXJzdCBuYW1lJyksXG5cdFx0XHRcdHNvcnRMYXN0TmFtZTogdCgnY29udGFjdHMnLCAnTGFzdCBuYW1lJylcblx0XHRcdH07XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ3ZDYXJkUHJvcGVydGllc1NlcnZpY2UnLCBmdW5jdGlvbigpIHtcblx0LyoqXG5cdCAqIG1hcCB2Q2FyZCBhdHRyaWJ1dGVzIHRvIGludGVybmFsIGF0dHJpYnV0ZXNcblx0ICpcblx0ICogcHJvcE5hbWU6IHtcblx0ICogXHRcdG11bHRpcGxlOiBbQm9vbGVhbl0sIC8vIGlzIHRoaXMgcHJvcCBhbGxvd2VkIG1vcmUgdGhhbiBvbmNlPyAoZGVmYXVsdCA9IGZhbHNlKVxuXHQgKiBcdFx0cmVhZGFibGVOYW1lOiBbU3RyaW5nXSwgLy8gaW50ZXJuYXRpb25hbGl6ZWQgcmVhZGFibGUgbmFtZSBvZiBwcm9wXG5cdCAqIFx0XHR0ZW1wbGF0ZTogW1N0cmluZ10sIC8vIHRlbXBsYXRlIG5hbWUgZm91bmQgaW4gL3RlbXBsYXRlcy9kZXRhaWxJdGVtc1xuXHQgKiBcdFx0Wy4uLl0gLy8gb3B0aW9uYWwgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiB3aGljaCBtaWdodCBnZXQgdXNlZCBieSB0aGUgdGVtcGxhdGVcblx0ICpcblx0ICpcdFx0b3B0aW9uczogSWYgbXVsdGlwbGUgb3B0aW9ucyBoYXZlIHRoZSBzYW1lIG5hbWUsIHRoZSBmaXJzdCB3aWxsIGJlIHVzZWQgYXMgZGVmYXVsdC5cblx0ICpcdFx0XHRcdCBPdGhlcnMgd2lsbCBiZSBtZXJnZSwgYnV0IHN0aWxsIHN1cHBvcnRlZC4gT3JkZXIgaXMgaW1wb3J0YW50IVxuXHQgKiB9XG5cdCAqL1xuXHR0aGlzLnZDYXJkTWV0YSA9IHtcblx0XHRuaWNrbmFtZToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdOaWNrbmFtZScpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0Jyxcblx0XHRcdGljb246ICdpY29uLXVzZXInXG5cdFx0fSxcblx0XHRuOiB7XG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0RldGFpbGVkIG5hbWUnKSxcblx0XHRcdGRlZmF1bHRWYWx1ZToge1xuXHRcdFx0XHR2YWx1ZTpbJycsICcnLCAnJywgJycsICcnXVxuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlOiAnbicsXG5cdFx0XHRpY29uOiAnaWNvbi11c2VyJ1xuXHRcdH0sXG5cdFx0bm90ZToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdOb3RlcycpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0YXJlYScsXG5cdFx0XHRpY29uOiAnaWNvbi1yZW5hbWUnXG5cdFx0fSxcblx0XHR1cmw6IHtcblx0XHRcdG11bHRpcGxlOiB0cnVlLFxuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdXZWJzaXRlJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3VybCcsXG5cdFx0XHRpY29uOiAnaWNvbi1wdWJsaWMnXG5cdFx0fSxcblx0XHRjbG91ZDoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0ZlZGVyYXRlZCBDbG91ZCBJRCcpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0Jyxcblx0XHRcdGRlZmF1bHRWYWx1ZToge1xuXHRcdFx0XHR2YWx1ZTpbJyddLFxuXHRcdFx0XHRtZXRhOnt0eXBlOlsnSE9NRSddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnSE9NRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0hvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUksnLCBuYW1lOiB0KCdjb250YWN0cycsICdXb3JrJyl9LFxuXHRcdFx0XHR7aWQ6ICdPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ090aGVyJyl9XG5cdFx0XHRdXHRcdH0sXG5cdFx0YWRyOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnQWRkcmVzcycpLFxuXHRcdFx0dGVtcGxhdGU6ICdhZHInLFxuXHRcdFx0aWNvbjogJ2ljb24tYWRkcmVzcycsXG5cdFx0XHRkZWZhdWx0VmFsdWU6IHtcblx0XHRcdFx0dmFsdWU6WycnLCAnJywgJycsICcnLCAnJywgJycsICcnXSxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ0hPTUUnXX1cblx0XHRcdH0sXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ0hPTUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnT1RIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdPdGhlcicpfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0Y2F0ZWdvcmllczoge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdHcm91cHMnKSxcblx0XHRcdHRlbXBsYXRlOiAnZ3JvdXBzJ1xuXHRcdH0sXG5cdFx0YmRheToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdCaXJ0aGRheScpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJyxcblx0XHRcdGljb246ICdpY29uLWNhbGVuZGFyLWRhcmsnXG5cdFx0fSxcblx0XHRhbm5pdmVyc2FyeToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdBbm5pdmVyc2FyeScpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJyxcblx0XHRcdGljb246ICdpY29uLWNhbGVuZGFyLWRhcmsnXG5cdFx0fSxcblx0XHRkZWF0aGRhdGU6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnRGF0ZSBvZiBkZWF0aCcpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJyxcblx0XHRcdGljb246ICdpY29uLWNhbGVuZGFyLWRhcmsnXG5cdFx0fSxcblx0XHRlbWFpbDoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0VtYWlsJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ2VtYWlsJyxcblx0XHRcdGljb246ICdpY29uLW1haWwnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOicnLFxuXHRcdFx0XHRtZXRhOnt0eXBlOlsnSE9NRSddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnSE9NRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0hvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUksnLCBuYW1lOiB0KCdjb250YWN0cycsICdXb3JrJyl9LFxuXHRcdFx0XHR7aWQ6ICdPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ090aGVyJyl9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHRpbXBwOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnSW5zdGFudCBtZXNzYWdpbmcnKSxcblx0XHRcdHRlbXBsYXRlOiAndXNlcm5hbWUnLFxuXHRcdFx0aWNvbjogJ2ljb24tY29tbWVudCcsXG5cdFx0XHRkZWZhdWx0VmFsdWU6IHtcblx0XHRcdFx0dmFsdWU6WycnXSxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ1NLWVBFJ119XG5cdFx0XHR9LFxuXHRcdFx0b3B0aW9uczogW1xuXHRcdFx0XHR7aWQ6ICdJUkMnLCBuYW1lOiAnSVJDJ30sXG5cdFx0XHRcdHtpZDogJ0tJSycsIG5hbWU6ICdLaUsnfSxcblx0XHRcdFx0e2lkOiAnU0tZUEUnLCBuYW1lOiAnU2t5cGUnfSxcblx0XHRcdFx0e2lkOiAnVEVMRUdSQU0nLCBuYW1lOiAnVGVsZWdyYW0nfSxcblx0XHRcdFx0e2lkOiAnWE1QUCcsIG5hbWU6J1hNUFAnfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0dGVsOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnUGhvbmUnKSxcblx0XHRcdHRlbXBsYXRlOiAndGVsJyxcblx0XHRcdGljb246ICdpY29uLWNvbW1lbnQnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOicnLFxuXHRcdFx0XHRtZXRhOnt0eXBlOlsnSE9NRSxWT0lDRSddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnSE9NRSxWT0lDRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0hvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ0hPTUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLLFZPSUNFJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnV09SSycsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsnKX0sXG5cdFx0XHRcdHtpZDogJ0NFTEwnLCBuYW1lOiB0KCdjb250YWN0cycsICdNb2JpbGUnKX0sXG5cdFx0XHRcdHtpZDogJ0NFTEwsVk9JQ0UnLCBuYW1lOiB0KCdjb250YWN0cycsICdNb2JpbGUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUkssQ0VMTCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsgbW9iaWxlJyl9LFxuXHRcdFx0XHR7aWQ6ICdGQVgnLCBuYW1lOiB0KCdjb250YWN0cycsICdGYXgnKX0sXG5cdFx0XHRcdHtpZDogJ0hPTUUsRkFYJywgbmFtZTogdCgnY29udGFjdHMnLCAnRmF4IGhvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUkssRkFYJywgbmFtZTogdCgnY29udGFjdHMnLCAnRmF4IHdvcmsnKX0sXG5cdFx0XHRcdHtpZDogJ1BBR0VSJywgbmFtZTogdCgnY29udGFjdHMnLCAnUGFnZXInKX0sXG5cdFx0XHRcdHtpZDogJ1ZPSUNFJywgbmFtZTogdCgnY29udGFjdHMnLCAnVm9pY2UnKX0sXG5cdFx0XHRcdHtpZDogJ0NBUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0NhcicpfSxcblx0XHRcdFx0e2lkOiAnUEFHRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdQYWdlcicpfSxcblx0XHRcdFx0e2lkOiAnV09SSyxQQUdFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsgcGFnZXInKX1cblx0XHRcdF1cblx0XHR9LFxuXHRcdCdYLVNPQ0lBTFBST0ZJTEUnOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnU29jaWFsIG5ldHdvcmsnKSxcblx0XHRcdHRlbXBsYXRlOiAndXNlcm5hbWUnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOlsnJ10sXG5cdFx0XHRcdG1ldGE6e3R5cGU6WydmYWNlYm9vayddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnRkFDRUJPT0snLCBuYW1lOiAnRmFjZWJvb2snfSxcblx0XHRcdFx0e2lkOiAnR0lUSFVCJywgbmFtZTogJ0dpdEh1Yid9LFxuXHRcdFx0XHR7aWQ6ICdHT09HTEVQTFVTJywgbmFtZTogJ0dvb2dsZSsnfSxcblx0XHRcdFx0e2lkOiAnSU5TVEFHUkFNJywgbmFtZTogJ0luc3RhZ3JhbSd9LFxuXHRcdFx0XHR7aWQ6ICdMSU5LRURJTicsIG5hbWU6ICdMaW5rZWRJbid9LFxuXHRcdFx0XHR7aWQ6ICdQSU5URVJFU1QnLCBuYW1lOiAnUGludGVyZXN0J30sXG5cdFx0XHRcdHtpZDogJ1FaT05FJywgbmFtZTogJ1Fab25lJ30sXG5cdFx0XHRcdHtpZDogJ1RVTUJMUicsIG5hbWU6ICdUdW1ibHInfSxcblx0XHRcdFx0e2lkOiAnVFdJVFRFUicsIG5hbWU6ICdUd2l0dGVyJ30sXG5cdFx0XHRcdHtpZDogJ1dFQ0hBVCcsIG5hbWU6ICdXZUNoYXQnfSxcblx0XHRcdFx0e2lkOiAnWU9VVFVCRScsIG5hbWU6ICdZb3VUdWJlJ31cblxuXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRyZWxhdGlvbnNoaXA6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnUmVsYXRpb25zaGlwJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3NlbGVjdCcsXG5cdFx0XHRpbmZvOiB0KCdjb250YWN0cycsICdTcGVjaWZ5IGEgcmVsYXRpb25zaGlwIGJldHdlZW4geW91IGFuZCB0aGUgZW50aXR5IHJlcHJlc2VudGVkIGJ5IHRoaXMgdkNhcmQuJyksXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ1NQT1VTRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Nwb3VzZScpfSxcblx0XHRcdFx0e2lkOiAnQ0hJTEQnLCBuYW1lOiB0KCdjb250YWN0cycsICdDaGlsZCcpfSxcblx0XHRcdFx0e2lkOiAnTU9USEVSJywgbmFtZTogdCgnY29udGFjdHMnLCAnTW90aGVyJyl9LFxuXHRcdFx0XHR7aWQ6ICdGQVRIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdGYXRoZXInKX0sXG5cdFx0XHRcdHtpZDogJ1BBUkVOVCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1BhcmVudCcpfSxcblx0XHRcdFx0e2lkOiAnQlJPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0Jyb3RoZXInKX0sXG5cdFx0XHRcdHtpZDogJ1NJU1RFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Npc3RlcicpfSxcblx0XHRcdFx0e2lkOiAnUkVMQVRJVkUnLCBuYW1lOiB0KCdjb250YWN0cycsICdSZWxhdGl2ZScpfSxcblx0XHRcdFx0e2lkOiAnRlJJRU5EJywgbmFtZTogdCgnY29udGFjdHMnLCAnRnJpZW5kJyl9LFxuXHRcdFx0XHR7aWQ6ICdDT0xMRUFHVUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdDb2xsZWFndWUnKX0sXG5cdFx0XHRcdHtpZDogJ01BTkFHRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdNYW5hZ2VyJyl9LFxuXHRcdFx0XHR7aWQ6ICdBU1NJU1RBTlQnLCBuYW1lOiB0KCdjb250YWN0cycsICdBc3Npc3RhbnQnKX0sXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRyZWxhdGVkOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnUmVsYXRlZCcpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0Jyxcblx0XHRcdGluZm86IHQoJ2NvbnRhY3RzJywgJ1NwZWNpZnkgYSByZWxhdGlvbnNoaXAgYmV0d2VlbiBhbm90aGVyIGVudGl0eSBhbmQgdGhlIGVudGl0eSByZXByZXNlbnRlZCBieSB0aGlzIHZDYXJkLicpLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOlsnJ10sXG5cdFx0XHRcdG1ldGE6e3R5cGU6WydDT05UQUNUJ119XG5cdFx0XHR9LFxuXHRcdFx0b3B0aW9uczogW1xuXHRcdFx0XHR7aWQ6ICdDT05UQUNUJywgbmFtZTogdCgnY29udGFjdHMnLCAnQ29udGFjdCcpfSxcblx0XHRcdFx0e2lkOiAnQUdFTlQnLCBuYW1lOiB0KCdjb250YWN0cycsICdBZ2VudCcpfSxcblx0XHRcdFx0e2lkOiAnRU1FUkdFTkNZJywgbmFtZTogdCgnY29udGFjdHMnLCAnRW1lcmdlbmN5Jyl9LFxuXHRcdFx0XHR7aWQ6ICdGUklFTkQnLCBuYW1lOiB0KCdjb250YWN0cycsICdGcmllbmQnKX0sXG5cdFx0XHRcdHtpZDogJ0NPTExFQUdVRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0NvbGxlYWd1ZScpfSxcblx0XHRcdFx0e2lkOiAnQ09XT1JLRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdDby13b3JrZXInKX0sXG5cdFx0XHRcdHtpZDogJ01BTkFHRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdNYW5hZ2VyJyl9LFxuXHRcdFx0XHR7aWQ6ICdBU1NJU1RBTlQnLCBuYW1lOiB0KCdjb250YWN0cycsICdBc3Npc3RhbnQnKX0sXG5cdFx0XHRcdHtpZDogJ1NQT1VTRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Nwb3VzZScpfSxcblx0XHRcdFx0e2lkOiAnQ0hJTEQnLCBuYW1lOiB0KCdjb250YWN0cycsICdDaGlsZCcpfSxcblx0XHRcdFx0e2lkOiAnTU9USEVSJywgbmFtZTogdCgnY29udGFjdHMnLCAnTW90aGVyJyl9LFxuXHRcdFx0XHR7aWQ6ICdGQVRIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdGYXRoZXInKX0sXG5cdFx0XHRcdHtpZDogJ1BBUkVOVCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1BhcmVudCcpfSxcblx0XHRcdFx0e2lkOiAnQlJPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0Jyb3RoZXInKX0sXG5cdFx0XHRcdHtpZDogJ1NJU1RFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Npc3RlcicpfSxcblx0XHRcdFx0e2lkOiAnUkVMQVRJVkUnLCBuYW1lOiB0KCdjb250YWN0cycsICdSZWxhdGl2ZScpfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0Z2VuZGVyOiB7XG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0dlbmRlcicpLFxuXHRcdFx0dGVtcGxhdGU6ICdzZWxlY3QnLFxuXHRcdFx0b3B0aW9uczogW1xuXHRcdFx0XHR7aWQ6ICdGJywgbmFtZTogdCgnY29udGFjdHMnLCAnRmVtYWxlJyl9LFxuXHRcdFx0XHR7aWQ6ICdNJywgbmFtZTogdCgnY29udGFjdHMnLCAnTWFsZScpfSxcblx0XHRcdFx0e2lkOiAnTycsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ090aGVyJyl9XG5cdFx0XHRdXG5cdFx0fVxuXHR9O1xuXG5cdHRoaXMuZmllbGRPcmRlciA9IFtcblx0XHQnb3JnJyxcblx0XHQndGl0bGUnLFxuXHRcdCd0ZWwnLFxuXHRcdCdlbWFpbCcsXG5cdFx0J2FkcicsXG5cdFx0J2ltcHAnLFxuXHRcdCduaWNrJyxcblx0XHQnYmRheScsXG5cdFx0J2Fubml2ZXJzYXJ5Jyxcblx0XHQnZGVhdGhkYXRlJyxcblx0XHQndXJsJyxcblx0XHQnWC1TT0NJQUxQUk9GSUxFJyxcblx0XHQncmVsYXRpb25zaGlwJyxcblx0XHQncmVsYXRlZCcsXG5cdFx0J25vdGUnLFxuXHRcdCdjYXRlZ29yaWVzJyxcblx0XHQncm9sZScsXG5cdFx0J2dlbmRlcidcblx0XTtcblxuXHR0aGlzLmZpZWxkRGVmaW5pdGlvbnMgPSBbXTtcblx0Zm9yICh2YXIgcHJvcCBpbiB0aGlzLnZDYXJkTWV0YSkge1xuXHRcdHRoaXMuZmllbGREZWZpbml0aW9ucy5wdXNoKHtpZDogcHJvcCwgbmFtZTogdGhpcy52Q2FyZE1ldGFbcHJvcF0ucmVhZGFibGVOYW1lLCBtdWx0aXBsZTogISF0aGlzLnZDYXJkTWV0YVtwcm9wXS5tdWx0aXBsZX0pO1xuXHR9XG5cblx0dGhpcy5mYWxsYmFja01ldGEgPSBmdW5jdGlvbihwcm9wZXJ0eSkge1xuXHRcdGZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7IHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSk7IH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0bmFtZTogJ3Vua25vd24tJyArIHByb3BlcnR5LFxuXHRcdFx0cmVhZGFibGVOYW1lOiBjYXBpdGFsaXplKHByb3BlcnR5KSxcblx0XHRcdHRlbXBsYXRlOiAnaGlkZGVuJyxcblx0XHRcdG5lY2Vzc2l0eTogJ29wdGlvbmFsJyxcblx0XHRcdGhpZGRlbjogdHJ1ZVxuXHRcdH07XG5cdH07XG5cblx0dGhpcy5nZXRNZXRhID0gZnVuY3Rpb24ocHJvcGVydHkpIHtcblx0XHRyZXR1cm4gdGhpcy52Q2FyZE1ldGFbcHJvcGVydHldIHx8IHRoaXMuZmFsbGJhY2tNZXRhKHByb3BlcnR5KTtcblx0fTtcblxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignSlNPTjJ2Q2FyZCcsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHRyZXR1cm4gdkNhcmQuZ2VuZXJhdGUoaW5wdXQpO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignY29udGFjdENvbG9yJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuXHRcdC8vIENoZWNrIGlmIGNvcmUgaGFzIHRoZSBuZXcgY29sb3IgZ2VuZXJhdG9yXG5cdFx0aWYodHlwZW9mIGlucHV0LnRvUmdiID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR2YXIgcmdiID0gaW5wdXQudG9SZ2IoKTtcblx0XHRcdHJldHVybiAncmdiKCcrcmdiWydyJ10rJywgJytyZ2JbJ2cnXSsnLCAnK3JnYlsnYiddKycpJztcblx0XHR9IGVsc2UgaWYodHlwZW9mIGlucHV0LnRvSHNsID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR2YXIgaHNsID0gaW5wdXQudG9Ic2woKTtcblx0XHRcdHJldHVybiAnaHNsKCcraHNsWzBdKycsICcraHNsWzFdKyclLCAnK2hzbFsyXSsnJSknO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBJZiBub3QsIHdlIHVzZSB0aGUgb2xkIG9uZVxuXHRcdFx0LyogZ2xvYmFsIG1kNSAqL1xuXHRcdFx0dmFyIGhhc2ggPSBtZDUoaW5wdXQpLnN1YnN0cmluZygwLCA0KSxcblx0XHRcdFx0bWF4UmFuZ2UgPSBwYXJzZUludCgnZmZmZicsIDE2KSxcblx0XHRcdFx0aHVlID0gcGFyc2VJbnQoaGFzaCwgMTYpIC8gbWF4UmFuZ2UgKiAyNTY7XG5cdFx0XHRyZXR1cm4gJ2hzbCgnICsgaHVlICsgJywgOTAlLCA2NSUpJztcblx0XHR9XG5cdH07XG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignY29udGFjdEdyb3VwRmlsdGVyJywgZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0cmV0dXJuIGZ1bmN0aW9uIChjb250YWN0cywgZ3JvdXApIHtcblx0XHRpZiAodHlwZW9mIGNvbnRhY3RzID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIGNvbnRhY3RzO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIGdyb3VwID09PSAndW5kZWZpbmVkJyB8fCBncm91cC50b0xvd2VyQ2FzZSgpID09PSB0KCdjb250YWN0cycsICdBbGwgY29udGFjdHMnKS50b0xvd2VyQ2FzZSgpKSB7XG5cdFx0XHRyZXR1cm4gY29udGFjdHM7XG5cdFx0fVxuXHRcdHZhciBmaWx0ZXIgPSBbXTtcblx0XHRpZiAoY29udGFjdHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb250YWN0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAoZ3JvdXAudG9Mb3dlckNhc2UoKSA9PT0gdCgnY29udGFjdHMnLCAnTm90IGdyb3VwZWQnKS50b0xvd2VyQ2FzZSgpKSB7XG5cdFx0XHRcdFx0aWYgKGNvbnRhY3RzW2ldLmNhdGVnb3JpZXMoKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRcdGZpbHRlci5wdXNoKGNvbnRhY3RzW2ldKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKGNvbnRhY3RzW2ldLmNhdGVnb3JpZXMoKS5pbmRleE9mKGdyb3VwKSA+PSAwKSB7XG5cdFx0XHRcdFx0XHRmaWx0ZXIucHVzaChjb250YWN0c1tpXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmaWx0ZXI7XG5cdH07XG59KTtcbiIsIi8vIGZyb20gaHR0cHM6Ly9kb2NzLm5leHRjbG91ZC5jb20vc2VydmVyLzExL2RldmVsb3Blcl9tYW51YWwvYXBwL2Nzcy5odG1sI21lbnVzXG5hbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignY291bnRlckZvcm1hdHRlcicsIGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRyZXR1cm4gZnVuY3Rpb24gKGNvdW50KSB7XG5cdFx0aWYgKGNvdW50ID4gOTk5OSkge1xuXHRcdFx0cmV0dXJuICc5OTk5Kyc7XG5cdFx0fVxuXHRcdGlmIChjb3VudCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuICcnO1xuXHRcdH1cblx0XHRyZXR1cm4gY291bnQ7XG5cdH07XG59KTtcblxuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2NvdW50ZXJUb29sdGlwRGlzcGxheScsIGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRyZXR1cm4gZnVuY3Rpb24gKGNvdW50KSB7XG5cdFx0aWYgKGNvdW50ID4gOTk5OSkge1xuXHRcdFx0cmV0dXJuIGNvdW50O1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH07XG59KTtcblxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignZmllbGRGaWx0ZXInLCBmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRyZXR1cm4gZnVuY3Rpb24gKGZpZWxkcywgY29udGFjdCkge1xuXHRcdGlmICh0eXBlb2YgZmllbGRzID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIGZpZWxkcztcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBjb250YWN0ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIGZpZWxkcztcblx0XHR9XG5cdFx0dmFyIGZpbHRlciA9IFtdO1xuXHRcdGlmIChmaWVsZHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKGZpZWxkc1tpXS5tdWx0aXBsZSApIHtcblx0XHRcdFx0XHRmaWx0ZXIucHVzaChmaWVsZHNbaV0pO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfLmlzVW5kZWZpbmVkKGNvbnRhY3QuZ2V0UHJvcGVydHkoZmllbGRzW2ldLmlkKSkpIHtcblx0XHRcdFx0XHRmaWx0ZXIucHVzaChmaWVsZHNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmaWx0ZXI7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCdmaXJzdENoYXJhY3RlcicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHRyZXR1cm4gaW5wdXQuY2hhckF0KDApO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignbG9jYWxlT3JkZXJCeScsIFtmdW5jdGlvbiAoKSB7XG5cdHJldHVybiBmdW5jdGlvbiAoYXJyYXksIHNvcnRQcmVkaWNhdGUsIHJldmVyc2VPcmRlcikge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShhcnJheSkpIHJldHVybiBhcnJheTtcblx0XHRpZiAoIXNvcnRQcmVkaWNhdGUpIHJldHVybiBhcnJheTtcblxuXHRcdHZhciBhcnJheUNvcHkgPSBbXTtcblx0XHRhbmd1bGFyLmZvckVhY2goYXJyYXksIGZ1bmN0aW9uIChpdGVtKSB7XG5cdFx0XHRhcnJheUNvcHkucHVzaChpdGVtKTtcblx0XHR9KTtcblxuXHRcdGFycmF5Q29weS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cblxuXHRcdFx0Ly8gRGlkIHdlIHBhc3MgbXVsdGlwbGUgc29ydGluZyBvcHRpb25zPyBJZiBub3QsIGNyZWF0ZSBhbiBhcnJheSBhbnl3YXkuXG5cdFx0XHRzb3J0UHJlZGljYXRlID0gYW5ndWxhci5pc0FycmF5KHNvcnRQcmVkaWNhdGUpID8gc29ydFByZWRpY2F0ZTogW3NvcnRQcmVkaWNhdGVdO1xuXHRcdFx0Ly8gTGV0J3MgdGVzdCB0aGUgZmlyc3Qgc29ydCBhbmQgY29udGludWUgaWYgbm8gc29ydCBvY2N1cmVkXG5cdFx0XHRmb3IodmFyIGk9MDsgaTxzb3J0UHJlZGljYXRlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBzb3J0QnkgPSBzb3J0UHJlZGljYXRlW2ldO1xuXG5cdFx0XHRcdHZhciB2YWx1ZUEgPSBhW3NvcnRCeV07XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRnVuY3Rpb24odmFsdWVBKSkge1xuXHRcdFx0XHRcdHZhbHVlQSA9IGFbc29ydEJ5XSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB2YWx1ZUIgPSBiW3NvcnRCeV07XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRnVuY3Rpb24odmFsdWVCKSkge1xuXHRcdFx0XHRcdHZhbHVlQiA9IGJbc29ydEJ5XSgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gU3RhcnQgc29ydGluZ1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc1N0cmluZyh2YWx1ZUEpKSB7XG5cdFx0XHRcdFx0aWYodmFsdWVBICE9PSB2YWx1ZUIpIHtcblx0XHRcdFx0XHRcdHJldHVybiByZXZlcnNlT3JkZXIgPyB2YWx1ZUIubG9jYWxlQ29tcGFyZSh2YWx1ZUEpIDogdmFsdWVBLmxvY2FsZUNvbXBhcmUodmFsdWVCKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoYW5ndWxhci5pc051bWJlcih2YWx1ZUEpIHx8IHR5cGVvZiB2YWx1ZUEgPT09ICdib29sZWFuJykge1xuXHRcdFx0XHRcdGlmKHZhbHVlQSAhPT0gdmFsdWVCKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV2ZXJzZU9yZGVyID8gdmFsdWVCIC0gdmFsdWVBIDogdmFsdWVBIC0gdmFsdWVCO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9KTtcblxuXHRcdHJldHVybiBhcnJheUNvcHk7XG5cdH07XG59XSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignbmV3Q29udGFjdCcsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHRyZXR1cm4gaW5wdXQgIT09ICcnID8gaW5wdXQgOiB0KCdjb250YWN0cycsICdOZXcgY29udGFjdCcpO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignb3JkZXJEZXRhaWxJdGVtcycsIGZ1bmN0aW9uKHZDYXJkUHJvcGVydGllc1NlcnZpY2UpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRyZXR1cm4gZnVuY3Rpb24oaXRlbXMsIGZpZWxkLCByZXZlcnNlKSB7XG5cblx0XHR2YXIgZmlsdGVyZWQgPSBbXTtcblx0XHRhbmd1bGFyLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdGZpbHRlcmVkLnB1c2goaXRlbSk7XG5cdFx0fSk7XG5cblx0XHR2YXIgZmllbGRPcmRlciA9IGFuZ3VsYXIuY29weSh2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLmZpZWxkT3JkZXIpO1xuXHRcdC8vIHJldmVyc2UgdG8gbW92ZSBjdXN0b20gaXRlbXMgdG8gdGhlIGVuZCAoaW5kZXhPZiA9PSAtMSlcblx0XHRmaWVsZE9yZGVyLnJldmVyc2UoKTtcblxuXHRcdGZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblx0XHRcdGlmKGZpZWxkT3JkZXIuaW5kZXhPZihhW2ZpZWxkXSkgPCBmaWVsZE9yZGVyLmluZGV4T2YoYltmaWVsZF0pKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdFx0aWYoZmllbGRPcmRlci5pbmRleE9mKGFbZmllbGRdKSA+IGZpZWxkT3JkZXIuaW5kZXhPZihiW2ZpZWxkXSkpIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fSk7XG5cblx0XHRpZihyZXZlcnNlKSBmaWx0ZXJlZC5yZXZlcnNlKCk7XG5cdFx0cmV0dXJuIGZpbHRlcmVkO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcigndG9BcnJheScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG5cdFx0aWYgKCEob2JqIGluc3RhbmNlb2YgT2JqZWN0KSkgcmV0dXJuIG9iajtcblx0XHRyZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWwsIGtleSkge1xuXHRcdFx0cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh2YWwsICcka2V5Jywge3ZhbHVlOiBrZXl9KTtcblx0XHR9KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ3ZDYXJkMkpTT04nLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG5cdFx0cmV0dXJuIHZDYXJkLnBhcnNlKGlucHV0KTtcblx0fTtcbn0pO1xuIl19
