import { createSignal, onMount } from 'solid-js'
import './App.css'
import { MCSClient } from 'mcs-sdk-web'

function App() {
  const [uid, setUid] = createSignal('')

  onMount(async () => {
    const client = new MCSClient()
    // will log error
    const userId = await client.join('test')
    setUid(userId)
  })

  return <div>uid: {uid()}</div>
}

export default App
