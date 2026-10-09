import urllib.request
import urllib.error
import time
import random
import os
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, unquote

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_first_row = False
        self.first_row_level = 0
        self.links = []
        self.current_level = 0

    def handle_starttag(self, tag, attrs):
        self.current_level += 1
        
        attrs_dict = dict(attrs)
        class_attr = attrs_dict.get('class', '')
        
        if 'firstRow' in class_attr.split():
            self.in_first_row = True
            self.first_row_level = self.current_level

        if self.in_first_row and tag == 'a' and 'href' in attrs_dict:
            self.links.append((attrs_dict['href'], attrs_dict.get('title') or attrs_dict.get('download') or ''))

    def handle_endtag(self, tag):
        if self.in_first_row and self.current_level == self.first_row_level:
            self.in_first_row = False
        self.current_level -= 1

def download_file(url, save_dir, retries=3):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://news.haeea.cn:8168/'
    }
    
    file_name = url.split('/')[-1]
    save_path = os.path.join(save_dir, unquote(file_name))
    
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as response, open(save_path, 'wb') as out_file:
                chunk_size = 8192
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
            print(f"[成功] 下载完成: {save_path}")
            return True, file_name
        except Exception as e:
            print(f"[警告] 下载失败 (尝试 {attempt+1}/{retries}): {url} - {str(e)}")
            time.sleep(random.uniform(2, 5))
            
    print(f"[失败] 达到最大重试次数: {url}")
    return False, file_name

def main():
    target_url = "https://news.haeea.cn:8168/a/202604/43664_744774c0.shtml"
    save_dir = "/Users/milic/Desktop/files/"
    
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    
    print(f"开始获取页面内容: {target_url}")
    try:
        req = urllib.request.Request(target_url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[错误] 无法获取页面内容: {e}")
        return

    parser = MyHTMLParser()
    parser.feed(html_content)
    
    links = [urljoin(target_url, link[0]) for link in parser.links]
    
    if not links:
        print("未通过精确树状解析找到 .firstRow 里面的链接，尝试基于字符串的正则备用方案...")
        # 寻找诸如 <foo class="firstRow"> 到 </foo> 之间的内容
        html_low = html_content.lower()
        items = re.findall(r'class=["\'][^"\']*?firstrow[^"\']*?["\'](.*?)</tr>', html_content, re.DOTALL | re.IGNORECASE)
        if not items:
             items = re.findall(r'class=["\'][^"\']*?firstrow[^"\']*?["\'](.*?)</(?:tr|div|p)>', html_content, re.DOTALL | re.IGNORECASE)
             
        for fragment in items:
            hrefs = re.findall(r'<a[^>]+href=["\']([^"\']+)["\']', fragment, re.IGNORECASE)
            links.extend([urljoin(target_url, h) for h in hrefs])

    # 如果还是没找到，可能HTML结构里根本没有首行，退而求其次：搜索包含 .doc, .pdf, .xls 的 a 标签
    if not links:
        print("依然没有在 .firstRow 中找到，提取页面所有附件类文件...")
        hrefs = re.findall(r'<a[^>]+href=["\']([^"\']+\.(?:docx?|xlsx?|pdf|zip|rar))["\']', html_content, re.IGNORECASE)
        links.extend([urljoin(target_url, h) for h in hrefs])

    # De-duplicate links but keep order
    links = list(dict.fromkeys(links))

    print(f"找到了 {len(links)} 个符合条件的文件链接。")
    if not links:
         print("没有找到要下载的文件。请检查网页结构。")
         return

    success_count = 0
    fail_count = 0
    failed_urls = []

    print("-" * 40)
    for index, link in enumerate(links):
        print(f"[{index + 1}/{len(links)}] 准备下载: {link}")
        
        # 增加随机延时，防止反爬
        if index > 0:
            delay = random.uniform(1.5, 4.0)
            print(f"等待 {delay:.2f} 秒...")
            time.sleep(delay)
            
        success, fname = download_file(link, save_dir)
        if success:
            success_count += 1
        else:
            fail_count += 1
            failed_urls.append(link)
            
    print("-" * 40)
    print("下载任务总结:")
    print(f"总计: {len(links)}")
    print(f"成功: {success_count}")
    print(f"失败: {fail_count}")
    
    if failed_urls:
         print("\n失败的链接记录:")
         for u in failed_urls:
              print(u)
              
         # 保存失败链接到日志文件方便重试
         fail_log = os.path.join(save_dir, "failed_urls.txt")
         with open(fail_log, "w") as f:
             for u in failed_urls:
                 f.write(u + "\n")
         print(f"失败的链接已记录到: {fail_log}")

if __name__ == "__main__":
    main()
