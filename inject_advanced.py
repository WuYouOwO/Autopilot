import re

with open('src/views/ConsoleView.vue', 'r') as f:
    content = f.read()

# 1. Inject advancedSettings
state_injection = """
const advancedSettings = ref({
  noTunMode: false,
  magicDns: true,
  autoStart: true,
  socks5Proxy: false,
  socks5Port: 1080,
  kcpProxy: false,
  wireguardAccess: false,
  wireguardPort: 51820,
  secureMode: false,
})
"""
content = re.sub(r'(const newNetworkForm = ref\(\{.*?\n\}\))', r'\1\n' + state_injection, content, flags=re.DOTALL)

# 2. Inject sidebar button
sidebar_button = """
        <!-- 6. 高级节点功能 -->
        <button
          type="button"
          @click="activeSubNav = 'advanced'; mobileMenuOpen = false"
          :class="[
            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md font-normal text-left transition-all duration-100 active:scale-[0.98] cursor-pointer',
            activeSubNav === 'advanced'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
              : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800'
          ]"
        >
          <Wrench class="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span>高级节点功能</span>
        </button>
"""
content = content.replace("<!-- 底部帮助与文档 -->", sidebar_button + "\n        <!-- 底部帮助与文档 -->")

# 3. Inject Main View
main_view = """
      <!-- -------------------- 视图 9: 高级节点功能 -------------------- -->
      <main v-else-if="activeSubNav === 'advanced'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-6 animate-in fade-in duration-200">
        <header class="pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            高级节点功能
          </h1>
          <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">配置本节点的底层网络行为、代理与安全模式，适用于复杂网络环境与特权访问限制。</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 基础特性组 -->
          <div class="p-5 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] shadow-xs space-y-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">核心特性</h3>
            
            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="relative flex items-center pt-0.5">
                <input type="checkbox" v-model="advancedSettings.noTunMode" class="peer sr-only" />
                <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">无 TUN 模式 (免 Root 权限)</span>
                <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">在非特权用户下运行，无需管理员权限。注意：开启后本节点只能作为被访问端或转发节点，无法主动发起网段访问。</span>
              </div>
            </label>

            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="relative flex items-center pt-0.5">
                <input type="checkbox" v-model="advancedSettings.magicDns" class="peer sr-only" />
                <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">魔法 DNS (Magic DNS)</span>
                <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">自动劫持虚拟网络的 DNS 请求，支持使用节点主机名 (.mesh.local) 直接互访。</span>
              </div>
            </label>

            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="relative flex items-center pt-0.5">
                <input type="checkbox" v-model="advancedSettings.autoStart" class="peer sr-only" />
                <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">开机自启 (注册为系统服务)</span>
                <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">自动将核心组件注册为 Systemd 或 Windows 服务，实现无人值守自动拉起。</span>
              </div>
            </label>

            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="relative flex items-center pt-0.5">
                <input type="checkbox" v-model="advancedSettings.secureMode" class="peer sr-only" />
                <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">Secure Mode (安全模式)</span>
                <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">启用后，所有跨节点的流量都将进行严格的 AES-GCM 载荷二次加密，防止任何链路侧听。</span>
              </div>
            </label>
          </div>

          <!-- 代理与转发组 -->
          <div class="p-5 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] shadow-xs space-y-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">协议代理与接入</h3>

            <!-- WireGuard -->
            <div class="space-y-3">
              <label class="flex items-start gap-3 cursor-pointer group">
                <div class="relative flex items-center pt-0.5">
                  <input type="checkbox" v-model="advancedSettings.wireguardAccess" class="peer sr-only" />
                  <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">开启 WireGuard 客户端接入</span>
                  <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">允许第三方标准 WireGuard 客户端设备接入虚拟网络。</span>
                </div>
              </label>
              <div v-if="advancedSettings.wireguardAccess" class="ml-13 p-3 bg-gray-50 dark:bg-[#1f1e1e] rounded-lg border border-gray-200 dark:border-[#333232]">
                <label class="block text-[11px] text-gray-500 mb-1">监听端口 (UDP)</label>
                <input type="number" v-model="advancedSettings.wireguardPort" class="w-full px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono" />
              </div>
            </div>

            <!-- SOCKS5 -->
            <div class="space-y-3">
              <label class="flex items-start gap-3 cursor-pointer group">
                <div class="relative flex items-center pt-0.5">
                  <input type="checkbox" v-model="advancedSettings.socks5Proxy" class="peer sr-only" />
                  <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">SOCKS5 端口转发</span>
                  <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">在本地开放一个 SOCKS5 代理端口，将流量透明转发入虚拟内网。</span>
                </div>
              </label>
              <div v-if="advancedSettings.socks5Proxy" class="ml-13 p-3 bg-gray-50 dark:bg-[#1f1e1e] rounded-lg border border-gray-200 dark:border-[#333232]">
                <label class="block text-[11px] text-gray-500 mb-1">监听端口 (TCP)</label>
                <input type="number" v-model="advancedSettings.socks5Port" class="w-full px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono" />
              </div>
            </div>

            <!-- KCP -->
            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="relative flex items-center pt-0.5">
                <input type="checkbox" v-model="advancedSettings.kcpProxy" class="peer sr-only" />
                <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 transition-colors">带宽延迟优化 (KCP/QUIC 代理)</span>
                <span class="text-xs text-gray-500 mt-0.5 leading-relaxed">将高丢包链路的 TCP 流量底层转为 KCP 或 QUIC 协议，大幅降低游戏和弱网环境下的传输延迟。</span>
              </div>
            </label>
          </div>
          
          <div class="col-span-1 lg:col-span-2 pt-2 flex justify-end">
            <button @click="showToast('已成功保存并应用节点高级配置！')" type="button" class="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md active:scale-95 transition-transform flex items-center gap-2">
              <Check class="w-4 h-4" />
              保存高级设置
            </button>
          </div>
        </div>
      </main>
"""

content = content.replace("</template>", main_view + "\n      </template>")

with open('src/views/ConsoleView.vue', 'w') as f:
    f.write(content)
