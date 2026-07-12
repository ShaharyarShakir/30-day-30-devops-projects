package metrics

import "net/http"

type Collector struct{}

func NewCollector() *Collector { return &Collector{} }

func (c *Collector) Handler() http.Handler { return http.NotFoundHandler() }

func (c *Collector) IncrementHandRaises()         {}
func (c *Collector) IncrementHandRaisesApproved() {}
func (c *Collector) IncrementHandRaisesRejected() {}
func (c *Collector) IncrementNotesCreated()       {}
func (c *Collector) IncrementNotesUpdated()       {}
func (c *Collector) IncrementNotesUpdates()       {}
func (c *Collector) IncrementNotesDeleted()       {}
func (c *Collector) IncrementPollCreated()        {}
func (c *Collector) IncrementPollUpdated()        {}
func (c *Collector) IncrementPollPublished()      {}
func (c *Collector) IncrementPollCompleted()      {}
func (c *Collector) IncrementPollDeleted()        {}
func (c *Collector) IncrementPollVotes()          {}
func (c *Collector) IncrementQuizCreated()        {}
func (c *Collector) IncrementQuizUpdated()        {}
func (c *Collector) IncrementQuizPublished()      {}
func (c *Collector) IncrementQuizCompleted()      {}
func (c *Collector) IncrementQuizDeleted()        {}
func (c *Collector) IncrementQuizSubmissions()    {}
func (c *Collector) IncrementWhiteboardCreated()  {}
func (c *Collector) IncrementWhiteboardUpdated()  {}
func (c *Collector) IncrementWhiteboardUpdates()  {}
func (c *Collector) IncrementWhiteboardDeleted()  {}
func (c *Collector) IncrementWhiteboardSnapshots() {}
func (c *Collector) IncrementWhiteboardElements() {}
