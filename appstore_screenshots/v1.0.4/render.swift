import AppKit
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: CommandLine.arguments[1])
let output = root.appendingPathComponent("appstore_screenshots/v1.0.4")
let titles = ["今日のメニュー、\nひと目で。", "積み重ねを、\nカレンダーに。", "新しい種目も、\nすぐに追加。", "自分のリズムで、\nじっくり鍛える。"]
let captions = ["セット・回数・進み具合を、すっきり確認。", "記録した日と、その日のメニューを振り返る。", "種目を検索。自分だけのメニューも作れる。", "メトロノームと休憩タイマーで、フォームに集中。"]
let names = ["menu", "calendar", "add", "timer"]
func color(_ hex:String)->NSColor {
 let h=hex.replacingOccurrences(of:"#",with:""); let v=UInt32(h,radix:16)!
 return NSColor(srgbRed:CGFloat((v>>16)&255)/255,green:CGFloat((v>>8)&255)/255,blue:CGFloat(v&255)/255,alpha:1)
}
func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ canvasH:CGFloat)->NSRect { NSRect(x:x,y:canvasH-y-h,width:w,height:h) }
func text(_ s:String,_ frame:NSRect,_ size:CGFloat,_ c:NSColor,_ weight:NSFont.Weight = .regular) {
 let p=NSMutableParagraphStyle();p.lineBreakMode = .byWordWrapping;p.lineSpacing=8
 let font=NSFont(name:weight == .bold ? "HiraginoSans-W6" : "HiraginoSans-W3",size:size) ?? NSFont.systemFont(ofSize:size,weight:weight)
 (s as NSString).draw(in:frame,withAttributes:[.font:font,.foregroundColor:c,.paragraphStyle:p])
}
for device in ["iphone","ipad"] {
 for i in 0..<4 {
  let input=output.appendingPathComponent("raw/\(device)-\(names[i]).png")
  guard let screenshot=NSImage(contentsOf:input) else { continue }
  let isPad=device == "ipad", w:CGFloat=isPad ? 2048:1284, h:CGFloat=isPad ? 2732:2778
  let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:Int(w),pixelsHigh:Int(h),bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
  NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)
  NSGraphicsContext.current!.imageInterpolation = .high
  let dark=i%2 == 1,bg=color(dark ? "182B23":"EDF3ED"),ink=color(dark ? "EDF7F0":"142A20"),muted=color(dark ? "B5CABE":"50695A")
  bg.setFill();NSBezierPath(rect:NSRect(x:0,y:0,width:w,height:h)).fill()
  let margin:CGFloat=isPad ? 150:92
  let icon=NSImage(contentsOf:root.appendingPathComponent("assets/icon.png"))!
  let iconRect=rect(margin,94,68,68,h)
  NSGraphicsContext.saveGraphicsState();NSBezierPath(roundedRect:iconRect,xRadius:16,yRadius:16).addClip();icon.draw(in:iconRect);NSGraphicsContext.restoreGraphicsState()
  text("SlowRep",rect(margin+92,108,600,60,h),39,ink,.bold)
  text(String(format:"%02d",i+1),rect(w-margin-85,108,100,60,h),36,muted)
  text(titles[i],rect(margin,225,w-margin*2,300,h),isPad ? 112:99,ink,.bold)
  text(captions[i],rect(margin,517,w-margin*2,110,h),isPad ? 42:35,muted)
  let screenH:CGFloat=isPad ? 1976:1980
  let screenW=screenH*screenshot.size.width/screenshot.size.height
  let screenX=(w-screenW)/2,screenY:CGFloat=isPad ? 663:681
  let deviceFrame=rect(screenX-12,screenY-12,screenW+24,screenH+24,h)
  NSGraphicsContext.saveGraphicsState()
  let shadow=NSShadow();shadow.shadowColor=NSColor.black.withAlphaComponent(dark ? 0.3:0.18);shadow.shadowBlurRadius=45;shadow.shadowOffset=NSSize(width:0,height:-24);shadow.set()
  color("31463A").setFill();NSBezierPath(roundedRect:deviceFrame,xRadius:isPad ? 40:62,yRadius:isPad ? 40:62).fill()
  NSGraphicsContext.restoreGraphicsState()
  let screenRect=rect(screenX,screenY,screenW,screenH,h)
  NSGraphicsContext.saveGraphicsState();NSBezierPath(roundedRect:screenRect,xRadius:isPad ? 28:50,yRadius:isPad ? 28:50).addClip();screenshot.draw(in:screenRect);NSGraphicsContext.restoreGraphicsState()
  NSGraphicsContext.restoreGraphicsState()
  let flat = CGContext(data:nil,width:Int(w),height:Int(h),bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
  flat.draw(rep.cgImage!,in:CGRect(x:0,y:0,width:w,height:h))
  let destination=CGImageDestinationCreateWithURL(output.appendingPathComponent("\(device)-0\(i+1)-\(names[i]).png") as CFURL,UTType.png.identifier as CFString,1,nil)!
  CGImageDestinationAddImage(destination,flat.makeImage()!,nil);CGImageDestinationFinalize(destination)
 }
}
