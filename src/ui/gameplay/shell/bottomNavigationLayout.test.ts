import {expect,test} from 'vitest'
import {deriveBottomNavigationLayout,fitBottomItems} from './bottomNavigationLayout'
import type {DysonNavigationPresentation} from './contracts'

test.each([304,344,784])('mobile shortcuts preserve 44px targets, drawer room and the current route at %spx',width=>{
 const items=Array.from({length:11},(_,i)=>({id:String(i),label:String(i),current:i===10})) as DysonNavigationPresentation['items']
 for(const includeText of [false,true]){
  const layout=deriveBottomNavigationLayout(width,items.length,includeText,2)
  const visible=fitBottomItems(items,layout.maxItems)
  expect(layout.slotWidth).toBeGreaterThanOrEqual(44)
  expect((visible.length+1)*layout.slotWidth).toBeLessThanOrEqual(width)
  expect(visible.some(item=>item.current)).toBe(true)
  if(width<528)expect(visible.length).toBeLessThan(items.length)
 }
})
