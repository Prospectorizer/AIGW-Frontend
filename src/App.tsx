'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Frame } from './ui'
import Overview from './Overview'
import Requests from './Requests'
import RequestDetail from './RequestDetail'
import { Providers, Infrastructure, Diagnoses, Settings } from './OtherPages'
import TestLab from './TestLab'

export default function App(){const route=usePathname()||'/overview';useEffect(()=>{if(location.hash.startsWith('#/'))location.replace(location.hash.slice(1))},[]);let page;if(route.startsWith('/requests/'))page=<RequestDetail id={decodeURIComponent(route.split('/')[2])}/>;else if(route.startsWith('/requests'))page=<Requests/>;else if(route.startsWith('/test'))page=<TestLab/>;else if(route.startsWith('/providers'))page=<Providers/>;else if(route.startsWith('/infrastructure'))page=<Infrastructure/>;else if(route.startsWith('/diagnoses'))page=<Diagnoses/>;else if(route.startsWith('/settings'))page=<Settings/>;else page=<Overview/>;return <Frame route={route}>{page}</Frame>}
