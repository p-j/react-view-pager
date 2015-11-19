import React, { Component, PropTypes, Children, cloneElement, createElement } from 'react'
import ReactDOM from 'react-dom'
import { Motion, spring, presets } from 'react-motion'
import modulo from './modulo';
import Slide from './Slide'

// touch / swipe
// http://codepen.io/barTsoury/post/optimization-of-swipe-gesture-on-list-items
// https://github.com/kenwheeler/nuka-carousel/blob/master/src/carousel.js#L162

class Slider extends Component {
  static propTypes = {
    component: PropTypes.string,
    wrap: PropTypes.bool,
    vertical: PropTypes.bool,
    currentKey: PropTypes.any,
    currentIndex: PropTypes.number,
    autoHeight: PropTypes.bool,
    sliderConfig: PropTypes.array,
    slideConfig: PropTypes.array,
    onChange: PropTypes.func
  }

  static defaultProps = {
    component: 'div',
    wrap: true,
    vertical: false,
    currentKey: 0,
    currentIndex: 0,
    autoHeight: false,
    sliderConfig: presets.noWobble,
    slideConfig: presets.noWobble,
    onChange: () => null
  }

  state = {
    currIndex: this._getNextIndex(this.props),
    nextIndex: null,
    direction: null,
    isSliding: false,
    currHeight: null
  }

  _slideCount = this.props.children.length

  componentDidMount() {
    this._node = ReactDOM.findDOMNode(this)
  }

  componentWillReceiveProps(nextProps) {
    const { currIndex, isSliding } = this.state
    const nextIndex = this._getNextIndex(nextProps)

    // keep an up to date count
    this._slideCount = nextProps.children.length

    // don't update state if index hasn't changed and we're not in the middle of a slide
    if (currIndex !== nextIndex && !isSliding) {
      this.setState({
        nextIndex,
        direction: this._getDirection(nextIndex),
        isSliding: true
      })
    }
  }

  // don't update unless height has changed or we have stopped sliding
  shouldComponentUpdate(nextProps, nextState) {
    const { currIndex, currHeight, isSliding } = this.state
    const newIndex = this._getIndexFromKey(nextProps)

    return (currHeight !== nextState.currHeight) || !isSliding
  }

  prev() {
    this._slide('prev')
  }

  next() {
    this._slide('next')
  }

  // does not animate to new height, but primes the slider whenever it moves to
  // a new slide so you don't get a jump from having an old height, useful if
  // children are affecting the wrapper height after moving to a new slide
  setHeight = (height, index) => {
    this.setState({
      currHeight: isNaN(height) ? this._node.scrollHeight : height,
      nextHeight: index === this.state.nextIndex ? height : null
    })
  }

  _getNextIndex(props) {
    return this.props.currentIndex || this._getIndexFromKey(props)
  }

  _getDirection(nextIndex) {
    return this.state.currIndex > nextIndex ? 'prev' : 'next'
  }

  _slide(direction) {
    const nextIndex = this._getNewIndex(direction)
    
    // if same index, bail out
    //if (this._lastIndex === nextIndex) return
    
    this.setState({
      nextIndex,
      direction,
      isSliding: true
    })

    // only store last index if we are not sliding
    // we only want to move ahead two ahead at a time
    //if (!this.state.isSliding) {
      this._lastIndex = nextIndex
    //}
  }

  _getKeyFromIndex(index) {
    const { children } = this.props
    let key = null

    Children.forEach(children, (child, _index) => {
      if (index === _index) {
        key = child.key
        return
      }
    })
    return key
  }

  _getIndexFromKey(props) {
    const { children, currentKey } = props
    let index = 0

    Children.forEach(children, (child, _index) => {
      if (child.key === currentKey) {
        index = _index
        return
      }
    })
    return index
  }

  _getNewIndex(direction) {
    // use the last index if we're in the middle of a slide since currIndex will be stale
    const currIndex = this.state.isSliding ? this._lastIndex : this.state.currIndex
    const delta = (direction === 'prev') ? -1 : 1

    if (this.props.wrap) {
      return modulo(currIndex + delta, this._slideCount)
    }

    const willWrap = (direction === 'prev' && currIndex === 0) ||
                     (direction === 'next' && currIndex === this._slideCount - 1)

    return willWrap ? currIndex : (currIndex + delta) % this._slideCount
  }

  _handleSlideEnd = (newIndex) => {
    const { currIndex, nextIndex } = this.state

    this.setState({
      currIndex: newIndex,
      nextIndex: null,
      direction: null,
      isSliding: false
    }, () => {
      // fire callback if values changed
      if (currIndex !== newIndex) {
        const key = this._getKeyFromIndex(newIndex)
        this.props.onChange(key, newIndex)
      }
    })
  }

  render() {
    const { component, children, className, vertical, autoHeight, sliderConfig, slideConfig } = this.props
    const { currIndex, nextIndex, nextHeight, direction, isSliding, currHeight } = this.state

    const childrenToRender = Children.map(children, (child, index) => {
      return createElement(
        Slide,
        {
          index,
          currIndex,
          nextIndex,
          nextHeight,
          direction,
          isSliding,
          vertical,
          slideConfig,
          onSlideEnd: this._handleSlideEnd,
          onGetHeight: this.setHeight
        },
        child
      )
    })

    return(
      !autoHeight ?
      createElement(component, {className}, childrenToRender) :
      createElement(
        Motion,
        {
          style: {
            height: spring(currHeight || 0, sliderConfig)
          }
        },
        ({height}) => {
          return createElement(
            component,
            {
              className,
              style: {
                height: isSliding ? height : null
              }
            },
            childrenToRender
          )
        }
      )
    )
  }
}

export default Slider