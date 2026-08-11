import { defineCustomElement } from 'vue'
import SmileyFace from './SmileyFace.ce.vue'

const TAG = 'ext-smiley-face'

if (!customElements.get(TAG)) {
  customElements.define(TAG, defineCustomElement(SmileyFace))
}
