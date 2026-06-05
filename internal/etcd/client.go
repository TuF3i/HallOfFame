package etcd

import (
	"fmt"

	clientv3 "go.etcd.io/etcd/client/v3"
)

type opt func(c *EtcdClient)

type EtcdClient struct {
	Client *clientv3.Client
	addr   string
	port   int
}

func (r *EtcdClient) Shutdown() error {
	return r.Client.Close()
}

func WithAddr(addr string) opt {
	return func(c *EtcdClient) {
		c.addr = addr
	}
}

func WithPort(port int) opt {
	return func(c *EtcdClient) {
		c.port = port
	}
}

func NewClient(opts ...opt) (*EtcdClient, error) {
	conf := new(EtcdClient)

	for _, opt := range opts {
		opt(conf)
	}

	client, err := clientv3.New(clientv3.Config{
		Endpoints: []string{fmt.Sprintf("%s:%d", conf.addr, conf.port)},
	})
	if err != nil {
		return nil, fmt.Errorf("create etcd client: %w", err)
	}

	conf.Client = client

	return conf, nil
}
