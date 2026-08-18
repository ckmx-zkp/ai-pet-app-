import { defineStore } from 'pinia'
import http from '../api/http'
import type { Device, DeviceRenamePayload } from '../api/types'

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
    },
    /** 改名（PATCH /devices/{id}）；404=设备不存在或已解绑，422=名称不合法，由调用方提示 */
    async renameDevice(deviceId: number, name: string) {
      const payload: DeviceRenamePayload = { name }
      const { data } = await http.patch<Device>(`/devices/${deviceId}`, payload)
      const index = this.devices.findIndex((device) => device.id === deviceId)
      if (index !== -1) this.devices[index] = data
    },
    /** 解绑（DELETE /devices/{id}，204）；解绑后 localStorage 中的当前选择随之更新 */
    async removeDevice(deviceId: number) {
      await http.delete(`/devices/${deviceId}`)
      this.devices = this.devices.filter((device) => device.id !== deviceId)
      if (this.activeDeviceId === deviceId) {
        // 与 fetchDevices 同款口径：切到剩余第一台，无剩余则清空当前选择
        this.setActiveDevice(this.devices[0]?.id ?? null)
      }
    }
  }
})
