import { defineStore } from 'pinia'
import http from '../api/http'
import type { Device } from '../api/types'

const ACTIVE_DEVICE_KEY = 'ai_pet_active_device_id'

interface DeviceState {
  devices: Device[]
  activeDeviceId: number | null
}

/** 当前用户设备及当前选中设备。后续人设、历史、记忆等页面共用此状态。 */
export const useDeviceStore = defineStore('devices', {
  state: (): DeviceState => ({
    devices: [],
    activeDeviceId: Number(localStorage.getItem(ACTIVE_DEVICE_KEY)) || null
  }),
  getters: {
    activeDevice: (state) =>
      state.devices.find((device) => device.id === state.activeDeviceId) ?? null
  },
  actions: {
    async fetchDevices() {
      const { data } = await http.get<Device[]>('/devices')
      this.devices = data
      const hasActiveDevice = data.some((device) => device.id === this.activeDeviceId)
      if (!hasActiveDevice) {
        this.setActiveDevice(data[0]?.id ?? null)
      }
    },
    setActiveDevice(deviceId: number | null) {
      this.activeDeviceId = deviceId
      if (deviceId === null) {
        localStorage.removeItem(ACTIVE_DEVICE_KEY)
      } else {
        localStorage.setItem(ACTIVE_DEVICE_KEY, String(deviceId))
      }
    }
  }
})
