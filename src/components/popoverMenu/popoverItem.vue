<!--
  - @copyright Copyright (c) 2018 John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @author John Molakvoæ <skjnldsv@protonmail.com>
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
	<li>
		<!-- If item.href is set, a link will be directly used -->
		<a v-if="item.href" :href="(item.href) ? item.href : '#' " :target="(item.target) ? item.target : '' "
			rel="noreferrer noopener" @click="item.action">
			<span :class="item.icon" />
			<span v-if="item.text">{{ item.text }}</span>
			<p v-else-if="item.longtext">{{ item.longtext }}</p>
		</a>
		<!-- If item.input is set instead, an put will be used -->
		<span v-else-if="item.input" class="menuitem">
			<input :id="item.key" :type="item.input" :class="item.input"
				v-model="item.model">
			<label :for="item.key">{{ item.text }}</label>
		</span>
		<!-- If item.action is set instead, a button will be used -->
		<button v-else-if="item.action" @click="item.action">
			<span :class="item.icon" />
			<span v-if="item.text">{{ item.text }}</span>
			<p v-else-if="item.longtext">{{ item.longtext }}</p>
		</button>
		<!-- If item.longtext is set AND the item does not have an action -->
		<span v-else class="menuitem">
			<span :class="item.icon" />
			<span v-if="item.text">{{ item.text }}</span>
			<p v-else-if="item.longtext">{{ item.longtext }}</p>
		</span>
	</li>
</template>

<script>
export default {
	props: {
		item: {
			type: Object,
			default: () => {
				return {
					key: '1',
					href: 'https://nextcloud.com',
					icon: 'icon-links',
					text: 'Nextcloud'
				}
			},
			required: true
		}
	}
}
</script>
