#!/usr/bin/env ruby
# encoding: utf-8

require 'optparse'
require 'httparty'
require 'merkle-hash-tree'
require 'digest'
require 'base64'

config_raw = ARGV.pop
config = JSON.parse(config_raw)

def defaultHeaders(token)
  { 
    'Accept' => '*/*',
    'Content-Type' => 'application/json',
    'Authorization' => 'Bearer ' + token
  }
end

def getToken(pia_url, app_key, app_secret)
  auth_url = pia_url + '/oauth/token'
  auth_credentials = { username: app_key, 
                       password: app_secret }
  response = HTTParty.post(auth_url,
                           basic_auth: auth_credentials,
                           body: { grant_type: 'client_credentials' })
  token = response.parsed_response["access_token"]
  if token.nil?
      nil
  else
      token
  end
end

def setupApp(pia_url, app_key, app_secret)
  token = getToken(pia_url, app_key, app_secret)
  { 
    "pia_url"    => pia_url,
    "app_key"    => app_key,
    "app_secret" => app_secret,
    "token"      => token 
  }
end

def writeLog(app, message)
  url = app["pia_url"] + '/api/logs/create'
  headers = defaultHeaders(app["token"])
  response = HTTParty.post(url,
                           headers: headers,
                           body: { identifier: "oyd.merkle",
                                   log: message }.to_json)
end

# setup
id_array = Array.new
hash_array = Array.new
mht = MerkleHashTree.new(hash_array, Digest::SHA256)
ma = setupApp(config["pia_url"], 
       config["app_key"],
       config["app_secret"])
# puts "Token: " + ma['token'].to_s
headers = defaultHeaders(ma["token"])

# get list of new and updated items
data_url = config["pia_url"] + '/api/items/merkle'
items = HTTParty.get(data_url,
                        headers: headers).parsed_response
# log entry
writeLog(ma, 'start: ' + items.count.to_s + ' items')

if items.count > 0
  # create merkel record
  create_merkle_url = config["pia_url"] + '/api/merkles/create'
  response = HTTParty.post(create_merkle_url,
              headers: headers,
              body: { }.to_json ).parsed_response
  merkle_id = response['id'].to_s

  # process each item
  items.each do |item|
      item_id = item['id']
      item_hash = Digest::SHA256.digest(item['value'])
      id_array << item_id
      hash_array << item_hash
      # puts item_id.to_s + ": " + Base64.encode64(item_hash).rstrip

      # write merkel.id in item
      update_item_url = config["pia_url"] + '/api/items/' + item_id.to_s
      tmp = HTTParty.put(update_item_url,
              headers: headers,
              body: {
                oyd_hash: item_hash.unpack('H*')[0].to_s,
                merkle_id: merkle_id }.to_json )

  end

  if hash_array.length == 1
      serialized_object = ""
      root_node = hash_array.first.unpack('H*')[0]
  else 
      serialized_object = Base64.strict_encode64(Marshal::dump(mht)).strip
      root_node = mht.head().unpack('H*')[0]
  end
  # puts "===================\n"
  # puts "root_node: " + root_node.to_s

  case ENV["BLOCKCHAIN"].to_s
  when "ARTIS"
      blockchain_url = 'http://' + ENV["DOCKER_LINK_BC"].to_s + ':' + (ENV["DOCKER_LINK_BC_PORT"] || "3000") + '/api/create'
      response = HTTParty.get(blockchain_url + "?hash=0x" + root_node)
      oyd_transaction = response.parsed_response["tx"].to_s
  else
      # request transaction
      blockchain_url = 'http://' + ENV["DOCKER_LINK_BC"].to_s + ':' + (ENV["DOCKER_LINK_BC_PORT"] || "4510") + '/create'
      puts "blockchain_url: " + blockchain_url.to_s
      puts "merkle_id: " + merkle_id.to_s
      puts "root_node: " + root_node.to_s
      response = HTTParty.post(blockchain_url,
                      headers: { 'Content-Type' => 'application/json'},
                      body: { id:   merkle_id, 
                              hash: root_node }.to_json ).parsed_response
      # puts "repsonse: " + response.to_s
      oyd_transaction = response['transaction-id']
  end

  # update merkel record and store
  update_merkle_url = config["pia_url"] + '/api/merkles/' + merkle_id.to_s
  response = HTTParty.put(update_merkle_url,
              headers: headers,
              body: { payload:         id_array.to_json,
                      merkle_tree:     serialized_object,
                      root_hash:       root_node,
                      oyd_transaction: oyd_transaction }.to_json )

  # log entry
  writeLog(ma, 'wrote ' + root_node.to_s + ' at ' + oyd_transaction.to_s)

end

# =============
# verify record
# 1) calculate hash from value
# 2) calculate audit proof with serialized mht to proof root_hash
# 3) use transaction to check root_hash in blockchain