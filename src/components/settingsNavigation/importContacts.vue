<!--
	- @copyright Copyright (c) 2018 Team Popcorn <teampopcornberlin@gmail.com>
	-
	- @author Team Popcorn <teampopcornberlin@gmail.com>
	-
	- @license GNU AGPL version 3 or any later version
	-
	- This program is free software: you can redistribute it and/or modify
	- it under the terms of the GNU Affero General Public License as
	- published by the Free Software Foundation, either version 3 of the
	- License, or (at your option) any later version.
	-
	- This program is distributed in the hope that it will be useful,
	- but WITHOUT ANY WARRANTY; without even the implied warranty of
	- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	- GNU Affero General Public License for more details.
	-
	- You should have received a copy of the GNU Affero General Public License
	- along with this program. If not, see <http://www.gnu.org/licenses/>.
	-
-->

<template>
	<div class="import-contact">
		<input id="contact-import" type="file" class="hidden-visually">
		<label id="upload" for="contact-import" class="button multiselect-label icon-upload no-select">
			{{ t('contacts', 'Import into') }}
		</label>
		<multiselect
			v-model="value"
			:options="options"
			:placeholder="t('contacts', 'Contacts')"
			class="multiselect-vue" />
	</div>
</template>

<script>
import clickOutside from 'vue-click-outside'
import Multiselect from 'vue-multiselect'

export default {
	components: {
		clickOutside,
		Multiselect
	},
	directives: {
		clickOutside
	},
	// props: ['addressbooks'],
	props: {
		addressbooks: {
			type: Array,
			required: false,
			default: undefined
		}
	},
	data() {
		return {
			value: ''
		}
	},
	computed: {
		options() {
			return [t('contacts', 'Contacts')].concat(this.addressbooks.map(x => x.displayName))
		}
	},
	methods: {

	}
}
</script>
