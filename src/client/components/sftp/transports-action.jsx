/**
 * pass transfer list from props
 * when list changes, do transfer and other op
 */

import { useDelta, useConditionalEffect } from 'react-delta'
import copy from 'json-deep-copy'
import Transports from './transports-ui'
import { maxTransport } from '../../common/constants'
import eq from 'fast-deep-equal'
import { isUndefined } from 'lodash-es'

export default (props) => {
  const { transferList, pauseAll, sessionId } = props
  const delta = useDelta(transferList)
  const pauseControl = useDelta(pauseAll)
  async function control () {
    props.modifier((old) => {
      let transferList = copy(old.transferList)
      transferList = transferList.map(t => {
        const {
          typeTo,
          typeFrom,
          fromFile,
          inited
        } = t
        const ready = !!fromFile
        if (typeTo === typeFrom && ready && !inited) {
          t.inited = true
        }
        return t
      })
      if (old.pauseAll) {
        window.store.setTransfers(transferList, sessionId)
        return {
          transferList
        }
      }
      let count = transferList.filter(t => {
        const {
          typeTo,
          typeFrom,
          inited
        } = t
        return typeTo !== typeFrom && inited
      }).length
      if (count >= maxTransport) {
        window.store.setTransfers(transferList, sessionId)
        return {
          transferList
        }
      }
      const len = transferList.length
      const ids = []
      for (let i = 0; i < len; i++) {
        const tr = transferList[i]
        const {
          typeTo,
          typeFrom,
          inited,
          fromFile,
          error,
          id,
          action,
          parentId,
          expanded
        } = tr
        if (!error) {
          ids.push(id)
        }
        const isTransfer = typeTo !== typeFrom
        const parentFolderNotFinished = parentId && ids.includes(parentId)
        const ready = (
          (action && fromFile && !fromFile.isDirectory) ||
          (action && fromFile && fromFile.isDirectory && expanded)
        )
        if (
          !ready ||
          inited ||
          !isTransfer ||
          parentFolderNotFinished
        ) {
          continue
        }
        // if (isTransfer && tr.fromFile.isDirectory) {
        //   i = len
        //   continue
        // }
        if (
          fromFile && count < maxTransport
        ) {
          count++
          tr.inited = true
        }
      }
      window.store.setTransfers(transferList, sessionId)
      return {
        transferList
      }
    })
  }
  useConditionalEffect(() => {
    control()
  }, pauseControl && pauseControl.prev && pauseControl.prev !== pauseControl.curr)
  useConditionalEffect(() => {
    control()
  }, delta && !isUndefined(delta.prev) && !eq(delta.prev, delta.curr))
  return (
    <Transports {...props} />
  )
}
