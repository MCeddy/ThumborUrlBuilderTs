import * as crypto from 'crypto-js';

import { HAlign, VAlign, CropModel, Format } from './models';

export class ThumborUrlBuilder {
    private imagePath = '';
    private width = 0;
    private height = 0;
    private smart = false;
    private fitInFlag = false;
    private flipHorizontally = false;
    private flipVertically = false;
    private hAlignValue: HAlign | null = null;
    private vAlignValue: VAlign | null = null;
    private cropValues: CropModel | null = null;
    private meta = false;
    private filtersCalls: string[] = [];

    constructor(private securityKey: string, private serverUrl: string) {}

    /**
     * Set path of image
     * @param {string} imagePath [description]
     */
    setImagePath(imagePath: string): ThumborUrlBuilder {
        this.imagePath =
            imagePath.charAt(0) === '/'
                ? imagePath.substring(1, imagePath.length)
                : imagePath;
        return this;
    }

    /**
     * Resize the image to the specified dimensions. Overrides any previous call
     * to `fitIn` or `resize`.
     *
     * Use a value of 0 for proportional resizing. E.g. for a 640 x 480 image,
     * `.resize(320, 0)` yields a 320 x 240 thumbnail.
     *
     * Use a value of 'orig' to use an original image dimension. E.g. for a 640
     * x 480 image, `.resize(320, 'orig')` yields a 320 x 480 thumbnail.
     * @param  {number} width
     * @param  {number} height
     */
    resize(width: number, height: number): ThumborUrlBuilder {
        this.width = width;
        this.height = height;
        return this;
    }

    smartCrop(smartCrop: boolean): ThumborUrlBuilder {
        this.smart = smartCrop;
        return this;
    }

    /**
     * Resize the image to fit in a box of the specified dimensions. Overrides
     * any previous call to `fitIn` or `resize`.
     *
     * @param  {String} width
     * @param  {String} height
     */
    fitIn(width: number, height: number): ThumborUrlBuilder {
        this.width = width;
        this.height = height;
        this.fitInFlag = true;
        return this;
    }

    /**
     * Flip image horizontally
     */
    withFlipHorizontally(): ThumborUrlBuilder {
        this.flipHorizontally = true;
        return this;
    }

    /**
     * Flip image vertically
     */
    withFlipVertically(): ThumborUrlBuilder {
        this.flipVertically = true;
        return this;
    }

    /**
     * Specify horizontal alignment used if width is altered due to cropping
     * @param  {HAlign} vAlign 'left', 'center', 'right'
     */
    hAlign(hAlign: HAlign): ThumborUrlBuilder {
        this.hAlignValue = hAlign;
        return this;
    }

    /**
     * Specify vertical alignment used if height is altered due to cropping
     * @param  {VAlign} vAlign 'top', 'middle', 'bottom'
     */
    vAlign(vAlign: VAlign): ThumborUrlBuilder {
        this.vAlignValue = vAlign;
        return this;
    }

    /**
     * Specify that JSON metadata should be returned instead of the thumbnailed
     * image.
     */
    metaDataOnly(): ThumborUrlBuilder {
        this.meta = true;
        return this;
    }

    /**
     * Append a filter, e.g. quality(80)
     * @param  {String} filterCall
     */
    filter(filterCall: string): ThumborUrlBuilder {
        this.filtersCalls.push(filterCall);
        return this;
    }

    format(format: Format): ThumborUrlBuilder {
        this.filter(`format(${format})`);
        return this;
    }

    /**
     * Manually specify crop window.
     * @param  {Integer} left
     * @param  {Integer} top
     * @param  {Integer} right
     * @param  {Integer} bottom
     */
    crop(
        left: number,
        top: number,
        right: number,
        bottom: number
    ): ThumborUrlBuilder {
        if (left > 0 && top > 0 && right > 0 && bottom > 0) {
            this.cropValues = {
                left: left,
                top: top,
                right: right,
                bottom: bottom
            };
        }
        return this;
    }

    /**
     * Combine image url and operations with secure and unsecure (unsafe) paths
     * @return {string}
     */
    buildUrl(): string {
        const operation = this.getOperationPath();
        const secureString = this.getSecureString(operation);

        return (
            this.serverUrl +
            '/' +
            secureString +
            '/' +
            operation +
            this.imagePath
        );
    }

    private getSecureString(operation: string): string {
        if (this.securityKey == null) {
            return 'unsafe';
        }

        const key = crypto.HmacSHA1(
            operation + this.imagePath,
            this.securityKey
        );

        const keyString = crypto.enc.Base64.stringify(key)
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return keyString;
    }

    /**
     * Converts operation array to string
     * @return {string}
     */
    private getOperationPath(): string {
        var parts = this.urlParts();

        if (0 === parts.length) {
            return '';
        }

        return parts.join('/') + '/';
    }

    /**
     * Build operation array
     *
     * @TODO Should be refactored so that strings are generated in the
     * commands as opposed to in 1 massive function
     *
     * @return {string[]}
     */
    urlParts(): string[] {
        if (!this.imagePath) {
            throw new Error("The image url can't be null or empty.");
        }

        let parts: string[] = [];

        if (this.meta === true) {
            parts.push('meta');
        }

        if (this.cropValues != null) {
            const { left, top, right, bottom } = this.cropValues;
            parts.push(`${left}x${top}:${right}x${bottom}`);
        }

        if (this.fitInFlag === true) {
            parts.push('fit-in');
        }

        if (
            this.width ||
            this.height ||
            this.flipHorizontally ||
            this.flipVertically
        ) {
            var sizeString = '';

            if (this.flipHorizontally === true) {
                sizeString += '-';
            }
            sizeString += this.width;

            sizeString += 'x';

            if (this.flipVertically === true) {
                sizeString += '-';
            }
            sizeString += this.height;

            parts.push(sizeString);
        }

        if (this.hAlignValue != null) {
            parts.push(this.hAlignValue);
        }

        if (this.vAlignValue != null) {
            parts.push(this.vAlignValue);
        }

        if (this.smart === true) {
            parts.push('smart');
        }

        if (this.filtersCalls.length > 0) {
            parts.push('filters:' + this.filtersCalls.join(':'));
        }

        return parts;
    }
}
