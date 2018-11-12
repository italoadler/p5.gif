import Gifuct from '../../lib/gif/gif';
import P5GIFError from './Error.js';
import Timer from './Timer.js';

export default class Gif {
    /** 
    This is the interface for GIf objec related methods
    */

    /**
     * Decode Credit to https://stackoverflow.com/questions/48234696/how-to-put-a-gif-with-canvas
     */
    
    // String: Source URI
    _src = ''; 
    get src() { return this._src; }

    // Boolean: is loading gif or pictures
    _isloading = false;
    get isLoading() { return this._isloading; }
    
    // p5Image{}[]
    _frames = null;
    get frames() { this.__checkLoading(); return this._frames; }

    // Boolean: if the gif is repeating
    set repeat(t) { this._gifConfig.repeat = !!t; }
    get repeat() { return this._gifConfig.repeat; }

    // Number[]: the delay of each frame
    set delay(t) {
        if (!this.__isList(t)) throw new P5GIFError('Cannot pass in a non-array.');
        for (let i = 0; i < this._frames.length; i++) {
            let _t = parseInt(t[i]);
            if (!_t || _t < 10) continue;
            else this._gifConfig.delay[i] = _t;
        }
        return this._gifConfig.delay;
    }
    setDelayOf(index, value) {
        index = parseInt(index);
        if (Number.isNaN(index) || index < 0 || index >= this._frames.length) throw new P5GIFError('The index is invalid');
        let _value = parseInt(value);
        if (!_value || _value < 10) _value = this._gifConfig.delay[index];
        this._gifConfig.delay[index] = _value;
        return _value;
    } 
    get delay() { this.__checkLoading(); return this._gifConfig.delay; }


    _gifConfig = {
        repeat: true,
        delay: [] //describe delay for every frame
    }

    /** 
    * @param {URI} sourceGif it could be gifUrl or a list of p5Image
    * @param {Object} gifConfig dict contains gif related configuration, ie. size, quality
    * @returns {Gif} 
    */
    constructor(sourceGif, gifConfig={}) {
       
        if (typeof sourceGif === 'string' && sourceGif.length) {
            this.__loadGif(sourceGif);
        }
        //TODO check if sourceGif contains p5Image
        else if (this.__isList(sourceGif) && this.__checkFrames(sourceGif)) {
            this._frames = this.__loadGifFromList(sourceGif);
        }
        else throw new P5GIFError('Wrong type of sourceGif.');
        this._gifConfig = Object.assign(this._gifConfig, gifConfig);
    }
    
    /**
     * 
     * @param {int} width resized width 
     * @param {int} height height 
     */
    resize(width, height){}

    /**
     * 
     * @param {name} the name you want to save as
     */
    download(name=''){}

    /**
     * 
     * @param {index} Which index you want to set 
     * @param {frame} the gif frame you want to set
     * @returns {Gif} 
     */
    setFrame(index, frame){}

    /**
     * 
     * @param {index} The start index  
     * @param {frames} Frames you want to insert
     * @param {Iterator} Optional, can replace your customized iterator for inseration. 
     * @returns {Gif}
     */
    insertFrames(index, frames, iterator=null) {}

    /**
     * 
     * @param {start} start index for the range(Inclued)
     * @param {end} end index for range (Not inclued) 
     * @param {step} step 
     * @return {[Gif]}
     */
    range(start, end, step=1) {}
    
    /**
     * 
     * @param {x} x position for your gif display(0 By default) 
     * @param {y} y position for your gif display (0 By default)
     */
    display(x=0, y=0) {}
    
    async __loadGif(url) {
        try {
            this._isloading = true;
            let buffer = await this.__fetch(url);
            this._src = url;
            let preframes = this.__decodeGif(buffer);
            this._frames = this.__pixel2Iamge(preframes);
            this._isloading = false;
        } catch(err) {
            this._isloading = false;
            throw err;
        }
    }

    __decodeGif(buffer) {
        // do something with the frame data
        let gif = new Gifuct(buffer);
        let preframes = gif.decompressFrames(true);
        return preframes;
    }

    /**
     * function to download file remotely
     * @param {String} url 
     * @returns {Promise}
     */
    __fetch(url) {
        return new Promise((resolve, reject) => {
            var ajax = new XMLHttpRequest();
                ajax.responseType = 'arraybuffer';
                ajax.onload = function (e) {
                    if( e.target.status >= 200 && e.target.status < 300 ) { resolve(ajax.response); }
                    else { reject(new P5GIFError('Fetch from internet failure.', e.target.status)) }
                };
                ajax.open('GET', url, true);
                ajax.send();
                ajax.onerror = function (e) { reject(e); };
        });
    }

    /**
     * convey pixels in gif to p5Image
     * @param {Array} preframes all frames in array
     * @returns {Array} frames call frames that are produced to p5Image
     */    
    __pixel2Iamge(preframes) {
        let frames = [];
        let _width = 0, _height = 0;
        preframes.forEach(frame => {
            this._gifConfig.delay.push(frame.delay);

            let {width, height} = frame.dims;
            _width = Math.max(_width, width);
            _height = Math.max(_height, height);

            let pixels = frame.pixels;
            //create image from pixel array
            let tempIamge = createImage(width, height);
            tempIamge.loadPixels();
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    let cursor = y * width + x;
                    tempIamge.set(x, y, color(pixels[cursor]));
                    //let cursor = y * width + 4*x;
                    //tempIamge.set(x, y, color(pixels[cursor], pixels[cursor+1], pixels[cursor+2], pixels[cursor+3]));
                }
            }
            tempIamge.updatePixels();
            frames.push(tempIamge);
        });

        this._gifConfig = Object.assign(this._gifConfig, {width: _width, height: _height});
        return frames;
    }

    /**
     * Check if the object is an array (or can be iterated)
     * @param {Object} obj 
     */
    __isList(obj) {
        return Array.isArray(obj); // Using Built-in Array Class to Check
    }
    
    /**
     * Only keep iterative items from an array object
     * @param {Array} arr 
     */
    __loadGifFromList(arr) {
        this._src = null;
        this._isloading = false;
        return Array.from(arr);
    }

    __checkFrames(arr) {
        if (!arr || !arr.forEach) {
            P5GIFError.throw('Cannot construct P5GIF from non-array object.');
            return false;
        }
        arr.forEach(item => {
            if (!(item instanceof p5.Image)) P5GIFError.throw('Elements of constructor array should be p5.Image objects.');
            return false;
        });
        return true;
    }

    __checkLoading() {
        if (this._isloading || !this._frames || !this._frames.length) throw new P5GIFError('Gif has not been prepared yet.', 1);
        return true;
    }

    /**
     * Controller of the gif
     */
    __currentController = null;
    get __controller() {

        // check if the gif is loaded, or if the controller exists
        this.__checkLoading();
        if (this.__currentController) return this.__currentController;

        // initialize controller
        let index = 0;
        let defaultConf = {
            x:0, y:0, width: this._gifConfig.width || 0, height: this._gifConfig.height || 0
        };

        // play routine loop
        let playRoutine = Timer.Routine(() => {
            let {x, y} = defaultConf;
            image(this._frames[index++], x, y);
            if (index >= this._frames.length) {
                index = 0;
                if (!this._gifConfig.repeat) playRoutine.stop();
            }
            return this._gifConfig.delay && this._gifConfig.delay[index] || 100;
        });

        // controllers
        const play = (defaultConf=null) => {
            if (defaultConf) this.defaultConf = Object.assign(this.defaultConf, defaultConf);
            playRoutine.start();
        }
        const next = () => { playRoutine.next(); }
        const pause = () => { playRoutine.pause(); }

        return this.__currentController = { 
            get play() {return play}, 
            get next() {return next},
            get pause() {return pause},
            get state() {return playRoutine.state}
        };

    }

    get play() { return this.__controller && this.__controller.play; }
    get next() { return this.__controller && this.__controller.next; }
    get pause() { return this.__controller && this.__controller.pause; }
    
}