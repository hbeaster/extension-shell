import { defineCustomElement } from 'vue'
import Buzzer from './Buzzer.ce.vue'

const TAG = 'ext-buzzer'

if (!customElements.get(TAG)) {
  customElements.define(TAG, defineCustomElement(Buzzer))
}
