const Apify = require('apify')
const { log } = Apify.utils
const { takeScreenshot, gifAddFrame } = require('./helper')
const gifEncoder = require('gif-encoder')
const fs = require('fs')

Apify.main(async () => {
  const input = await Apify.getInput();
  const keyValueStore = await Apify.openKeyValueStore()

  const browser = await Apify.launchPuppeteer({
    useChrome: false
  })
  const page = await browser.newPage()

  log.info(`Setting page viewport to ${input.viewport.width}x${input.viewport.height}`)
  await page.setViewport({
    width: input.viewport.width,
    height: input.viewport.height
  })

  log.info(`Opening page: ${input.url}`)
  await page.goto(input.url, { waitUntil: 'networkidle2' })

  //scrolling
  const bodyHandle = await page.$('body');
  const { height: pageHeight } = await bodyHandle.boundingBox();  // get page height
  await bodyHandle.dispose();

  let scrolledUntil = input.viewport.height   // starting height is viewport height
  const amountToScroll = Math.round(input.viewport.height * input.scrollPercentage)

  // create base gif file to write to
  // let gif = await keyValueStore.setValue('scroll.gif', buffer, {
  //   contentType: 'image/gif',
  // })

  let gif = new gifEncoder(input.viewport.width, input.viewport.height)

  gif.setFrameRate(7)
  gif.pipe(fs.createWriteStream('scroll.gif'))
  gif.writeHeader()

  // wait 5 sec to make sure page is fully loaded
  const waitTime = 5000
  log.info(`Wait for ${waitTime} ms so that page is fully loaded`)
  await new Promise (resolve => setTimeout(resolve, waitTime))

  // click cookie pop-up away
  log.info('Clicking cookie pop-up away')
  if (input.cookieAcceptSelector) {
    await page.waitForSelector(input.cookieAcceptSelector)
    await page.click(input.cookieAcceptSelector)
  }

  // add first frame multiple times so there is some delay before gif starts visually scrolling
  for (itt = 0; itt < input.beginDelay; itt++) {
    const initialScreenshotBuffer = await takeScreenshot(page, input)  // take screenshot each time so animations also show well
    await gifAddFrame(initialScreenshotBuffer, gif)
  }

  // scroll down
  while (pageHeight > scrolledUntil) {
    const screenshotBuffer = await takeScreenshot(page, input)

    await gifAddFrame(screenshotBuffer, gif)
    
    log.info(`Scrolling down by ${amountToScroll} pixels`)
    await page.evaluate(amountToScroll => {
      window.scrollBy(0, amountToScroll);
    }, amountToScroll);

    scrolledUntil += amountToScroll
  }

  gif.finish()

  // //gif part
  // const gif = new GIFEncoder(input.viewport.width, input.viewport.height)

  // // Setup gif gif parameters
  // gif.setFrameRate(60)  // Set delay based on amount of frames per second. Cannot be used with gif.setDelay
  // gif.setRepeat(0)  //Sets amount of times to repeat GIF. 0 -> loop indefinitely
  // // gif.pipe(file)
});

// GIF framerate
// GIF duration
// Delay before recording
// Element to click -> clickSelector
// Screen Dimensions -> viewport
// Desired Output resolution 
