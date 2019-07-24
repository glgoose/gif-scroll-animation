const Apify = require('apify')
const { log } = Apify.utils
const GifEncoder = require('gif-encoder')
const { 
  takeScreenshot, 
  gifAddFrame, 
  getGifBuffer,
  lossyCompression,
  saveGif
 } = require('./helper')


Apify.main(async () => {
  const input = await Apify.getInput()

  const browser = await Apify.launchPuppeteer({
    useChrome: false
  })
  const page = await browser.newPage()

  log.info(`Setting page viewport to ${input.viewport.width}x${input.viewport.height}`)
  await page.setViewport({
    width: input.viewport.width,
    height: input.viewport.height
  })

  // slow down animations so they can be captured with screenshots
  const session = await page.target().createCDPSession();
  await session.send('Animation.enable');
  await session.send('Animation.getPlaybackRate')
  await session.send('Animation.setPlaybackRate', {
    playbackRate: 0.1,
  });

  log.info(`Opening page: ${input.url}`)
  await page.goto(input.url, { waitUntil: 'networkidle2' })

  // get page height to determine when we scrolled to the bottom
  // initially used body height via boundingbox but this is not always equal to document height
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const scrollTop = await page.evaluate(() => document.documentElement.scrollTop)

  const viewport = {
    width: page.viewport().width,
    height: page.viewport().height
  }

  let scrolledUntil = viewport.height + scrollTop   //set initial position the window/viewport is at
  const scrollByAmount = Math.round(viewport.height * input.scrollPercentage)

  const siteName = input.url.match(/(\w+\.)?[\w-]+\.\w+/g)

  let gif = new GifEncoder(viewport.width, viewport.height)
  const gifFileName = `${siteName}-scroll`

  gif.setFrameRate(input.frameRate)

  let chunks = []
  gif.on('data', (chunk) => chunks.push(chunk))
  gif.writeHeader()

  // wait 3 sec to make sure page is fully loaded
  const waitTime = 3000
  log.info(`Wait for ${waitTime} ms so that page is fully loaded`)
  await new Promise(resolve => setTimeout(resolve, waitTime))

  // click cookie pop-up away
  if (input.cookieAcceptSelector) {
    log.info('Clicking cookie pop-up away')
    await page.waitForSelector(input.cookieAcceptSelector)
    await page.click(input.cookieAcceptSelector)
  }

  // add first frame multiple times so there is some delay before gif starts visually scrolling
  for (itt = 0; itt < input.beginDelay; itt++) {
    const initialScreenshotBuffer = await takeScreenshot(page, input)  // take screenshot each time so animations also show well
    await gifAddFrame(initialScreenshotBuffer, gif)
  }

  // start scrolling down
  while (pageHeight > scrolledUntil) {
    const screenshotBuffer = await takeScreenshot(page, input)

    await gifAddFrame(screenshotBuffer, gif)

    log.info(`Scrolling down by ${scrollByAmount} pixels`)
    await page.evaluate(scrollByAmount => {
      window.scrollBy(0, scrollByAmount);
    }, scrollByAmount);

    scrolledUntil += scrollByAmount
  }
  browser.close()
  
  gif.finish()
  const gifBuffer = await getGifBuffer(gif)
  const lossyBuffer = await lossyCompression(gifBuffer)

  await saveGif(`${gifFileName}.gif`, gifBuffer)
  await saveGif(`${gifFileName}_lossy-comp.gif`, lossyBuffer)

  log.info('Actor finished')
})
